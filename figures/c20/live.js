export default function mount(root, ctx, K, DATA) {
  const {k}=K, stage=ctx.stage;
  const stacks=[...root.querySelectorAll('[data-stack]')];
  const supply=root.querySelector('[data-supply]');
  const index=root.querySelector('[data-index]');
  const buttons=[...root.querySelectorAll('[data-tier]')];
  const platens=[...root.querySelectorAll('[data-platen]')];
  const ram=root.querySelector('[data-ram]');
  const wheel=root.querySelector('[data-wheel]');
  const refs=stacks.concat(supply,ram).map(g=>({fill:g.querySelector('.iso-fill'),top:g.querySelector('.iso-top'),outline:g.querySelector('.iso-edge'),crease:g.querySelector('.iso-crease'),bevel:g.querySelector('.iso-bevel'),shades:[0,1,2,3].map(i=>g.querySelector(`[data-shade="${i}"]`)),seams:g.querySelector('[data-cards],[data-supply-cards]'),paperTop:g.querySelector('[data-card-top],[data-supply-top]'),print:g.querySelector('[data-card-print],[data-supply-print]')}));
  let state=ctx.state,result=ctx.result,selected=0,preview=null,visible=true,frame=0,last=0,clock=0,alive=true;
  let heights=[17,17,17,48],target=[17,17,17,48],slider=0,sliderTarget=0;
  let stroke=0;
  let hover=false,focus=false,tour=false,timer=0;
  let pointerStart=null,lastDescription='';
  const attr=(el,name,value)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
  function text(reader=false) {
    if(!result)return;
    const i=preview??selected;
    const compact=value=>ctx.format(value,{notation:'compact',maximumFractionDigits:2});
    ctx.readout(i===3?ctx.t('read.capacity',{series:compact(result.metrics[0].value),rate:compact(result.metrics[1].value)}):ctx.t(['read.raw','read.minute','read.hour'][i],{points:compact(result.table.rows[i][1])}));
    const description=ctx.t(['btn.raw','btn.minute','btn.hour','btn.capacity'][i])+': '+ctx.t('description',{series:ctx.format(result.metrics[0].value),rate:ctx.format(result.metrics[1].value),interval:ctx.format(state.interval),storage:ctx.format(result.metrics[2].value),saving:ctx.format(result.metrics[3].value)});
    if(reader&&description!==lastDescription){lastDescription=description;ctx.describe(description);}
    stacks.concat(supply).forEach((g,n)=>{const solid=g.querySelector('.iso-solid');if(n===i)attr(solid,'data-lit','');else if(solid.hasAttribute('data-lit'))solid.removeAttribute('data-lit');});
    buttons.forEach((b,n)=>attr(b,'aria-pressed',String(n===selected)));
  }
  function geometry(ref,plan,z,h) {
    const bundles=state?Math.max(1,Math.round(state.metrics/10)):1;
    if(ref.lastHeight===h&&ref.lastBundles===bundles)return;
    ref.lastHeight=h;ref.lastBundles=bundles;
    const p=k.slabOf(plan,z,h,DATA.P,4,0.6);
    for(const key of ['fill','top','outline','crease','bevel']) if(ref[key])ref[key].setAttribute('d',p[key]||'');
    ref.shades.forEach((el,i)=>{if(el)el.setAttribute('d',p.shades[i]||'');});
    if(ref.seams) {
      // Each visible laminated band groups the control's ten-metric increment.
      const backing=ref===refs[3]?8:1;
      let seams=k.sideSeam(plan,z+backing,DATA.P,4);
      for(let i=1;i<bundles;i++)seams+=k.sideSeam(plan,z+backing+(h-backing)*i/bundles,DATA.P,4);
      ref.seams.setAttribute('d',seams);
      ref.paperTop.setAttribute('d',k.planOutline(k.insetPlan(plan,2.4),z+h,DATA.P,4));
      let printed='';
      for(let i=0;i<3;i++)printed+=k.lineOnTop([plan.x+5,plan.y+6+i*3],[plan.x+plan.w-6-i*4,plan.y+6+i*3],z+h,DATA.P);
      ref.print.setAttribute('d',printed);
    }
  }
  function tick(now) {
    frame=0;if(!alive||!visible)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;clock+=dt;
    const reduced=ctx.reduced();
    if(tour&&!reduced&&!hover&&!focus){const next=Math.floor(clock/2.4)%4;if(selected!==next){selected=next;text();}}
    let moving=false;
    for(let i=0;i<4;i++) {
      heights[i]=reduced?target[i]:heights[i]+(target[i]-heights[i])*(1-Math.exp(-dt/0.25));
      if(Math.abs(heights[i]-target[i])<0.01)heights[i]=target[i];else moving=true;
      if(i<3)geometry(refs[i],DATA.tiers[i].plan,DATA.tiers[i].z,heights[i]);else geometry(refs[i],DATA.supply.plan,DATA.supply.z,heights[i]);
    }
    slider=reduced?sliderTarget:slider+(sliderTarget-slider)*(1-Math.exp(-dt/0.25));
    if(Math.abs(slider-sliderTarget)<0.001)slider=sliderTarget;
    attr(index,'transform',k.translateAlong(DATA.P,[slider*54,0,0]));
    if(Math.abs(slider-sliderTarget)>0.001)moving=true;
    const travel=Math.min(16,Math.max(0,62-heights[3]));
    const strokeTarget=tour&&!reduced&&!hover&&!focus?travel*(1-Math.cos(2*Math.PI*clock/(state?.interval||10)))/2:0;
    stroke=reduced?0:Math.min(travel,stroke+(strokeTarget-stroke)*(1-Math.exp(-dt/0.25)));
    if(Math.abs(stroke-strokeTarget)<0.01)stroke=strokeTarget;else moving=true;
    const transform=k.translateAlong(DATA.P,[0,0,-stroke]);
    platens.forEach(el=>attr(el,'transform',transform));
    geometry(refs[4],{x:62,y:-29,w:6,d:6,r:1},78-stroke,33+stroke);
    let spokes='';
    const turn=stroke*Math.PI/12;
    for(let i=0;i<4;i++){const a=turn+i*Math.PI/2;spokes+=k.lineOnTop([65+3*Math.cos(a),-26+3*Math.sin(a)],[65+11.5*Math.cos(a),-26+11.5*Math.sin(a)],132,DATA.P);}
    attr(wheel,'d',spokes);
    if(moving||(tour&&!reduced&&!hover&&!focus))run();
  }
  function run(){if(!frame&&visible&&alive)frame=requestAnimationFrame(tick);}
  function schedule(ms=3600){clearTimeout(timer);timer=setTimeout(()=>{if(!hover&&!focus&&!ctx.reduced()){tour=true;clock=selected*2.4;run();}},ms);}
  function pause(){tour=false;clearTimeout(timer);schedule();run();}
  function choose(i){selected=Math.max(0,Math.min(3,i));preview=null;pause();text(true);ctx.announce(ctx.t(['btn.raw','btn.minute','btn.hour','btn.capacity'][selected]));}
  function pick(e){const part=e.target.closest('[data-stack],[data-supply],[data-pick]');if(!part||!stage.contains(part))return null;return part.hasAttribute('data-supply')?3:Number(part.getAttribute('data-stack')??part.getAttribute('data-pick'));}
  function pointer(e){hover=true;pause();const next=pick(e);if(next!==preview){preview=next;text();}}
  function clearPreview(){preview=null;text();}
  function enter(){hover=true;pause();}
  function leave(){hover=false;clearPreview();schedule();}
  function press(e){pointerStart={x:e.clientX,y:e.clientY,cancelled:false};pointer(e);}
  function cancel(){if(pointerStart)pointerStart.cancelled=true;clearPreview();}
  function commit(e){if(pointerStart&&(pointerStart.cancelled||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>=6)){pointerStart=null;return;}pointerStart=null;const choice=pick(e);if(choice!==null)choose(choice);}
  function key(e){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' ','Escape'].includes(e.key))return;
    e.preventDefault();pause();
    if(e.key==='ArrowUp'||e.key==='ArrowDown')choose((selected+(e.key==='ArrowUp'?3:1))%4);
    else if(e.key==='Enter'||e.key===' ')choose((selected+1)%4);
    else if(e.key==='Escape'){preview=null;text();}
    else {const value=e.key==='Home'?5:e.key==='End'?60:Math.max(5,Math.min(60,state.interval+(e.key==='ArrowRight'?5:-5)));ctx.set({interval:value});}
  }
  function onfocus(){focus=true;pause();text(true);}
  function onblur(e){if(root.contains(e.relatedTarget))return;focus=false;schedule();}
  const clicks=buttons.map((button,i)=>{const fn=()=>choose(i);button.addEventListener('click',fn);return fn;});
  stage.addEventListener('pointermove',pointer);stage.addEventListener('pointerleave',clearPreview);stage.addEventListener('pointerdown',press);stage.addEventListener('pointercancel',cancel);stage.addEventListener('click',commit);stage.addEventListener('keydown',key);
  root.addEventListener('pointerenter',enter);root.addEventListener('pointerleave',leave);root.addEventListener('focusin',onfocus);root.addEventListener('focusout',onblur);
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){last=0;run();}else{cancelAnimationFrame(frame);frame=0;last=0;}},{rootMargin:'120px 0px'});observer.observe(stage);
  schedule(1400);
  return {
    update(s,r){state=s;result=r;if(!s||!r)return;
      const values=r.table.rows.map(row=>row[1]),total=values.reduce((a,b)=>a+b,0);
      target=values.map(v=>1+26*v/total).concat(8+48*Math.log1p(r.metrics[0].value)/Math.log1p(200000000));
      sliderTarget=(s.interval-5)/55;text(focus);run();
    },
    relocalize(){text(Boolean(lastDescription));ctx.announce('');},
    destroy(){alive=false;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();stage.removeEventListener('pointermove',pointer);stage.removeEventListener('pointerleave',clearPreview);stage.removeEventListener('pointerdown',press);stage.removeEventListener('pointercancel',cancel);stage.removeEventListener('click',commit);stage.removeEventListener('keydown',key);root.removeEventListener('pointerenter',enter);root.removeEventListener('pointerleave',leave);root.removeEventListener('focusin',onfocus);root.removeEventListener('focusout',onblur);buttons.forEach((b,i)=>b.removeEventListener('click',clicks[i]));}
  };
}
