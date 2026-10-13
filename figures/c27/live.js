export default function mount(root,ctx,K,DATA) {
  const {k}=K, P=DATA.P, stage=ctx.stage;
  const loads=[0,1,2].map(i=>[0,1,2,3].map(j=>root.querySelector(`[data-load="${i}"][data-layer="${j}"]`)));
  const shapes=loads.map(row=>row.map(group=>({group,fill:group.querySelector('.iso-fill'),top:group.querySelector('.iso-top'),edge:group.querySelector('.iso-edge'),crease:group.querySelector('.iso-crease'),bevel:group.querySelector('.iso-bevel'),shades:[...group.querySelectorAll('.iso-shade')],seam:group.querySelector('.iso-solid>.iso-line:not(.iso-edge):not(.iso-crease):not(.iso-bevel)'),stamp:group.querySelector('[data-bank-stamp]'),face:group.querySelector('[data-bank-stamp-face]')})));
  const needles=[0,2].map(i=>root.querySelector(`[data-dial="${i}"]`));
  const displays=[0,1,2].map(i=>root.querySelector(`[data-balance="${i}"]`));
  const choices=[...root.querySelectorAll('[data-choice]')];
  const carriage=[...root.querySelectorAll('[data-carriage]')];
  const tape=root.querySelector('[data-tape]'),pointer=root.querySelector('[data-replay-pointer]');
  const weights=[0,1,2,3].map(i=>root.querySelector(`[data-weight="${i}"]`));
  const machine=root.querySelector('[data-machine]');
  const paintOrder=[...machine.children].map(el=>({el,key:Number(el.dataset.key),lift:Number(el.dataset.lift)}));
  let lastPaint=[...paintOrder];
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  const modes=['cancel','none','resume'];
  let state=null,result=null,frame=0,last=0,visible=true,clock=0,x=0,target=0;
  let touring=false,timer=0,hover=false,focused=false,preview=null,selected=null,gesture=null,feedback=false;
  let level=[0,0,0],wants=[0,0,0],rendered=[-1,-1,-1];
  let replayPhase=0,replaySpeed=0,drawnX=NaN,drawnReplay=NaN,drawnNeedles=[NaN,NaN],description='';
  let bankCounts=[0,0,0],markerCount=4;
  const bundle=(value,n,i)=>n?Math.floor(value/n)+(i<value%n?1:0):0;
  const attr=(el,name,value)=>{if(el&&el.getAttribute(name)!==value)el.setAttribute(name,value);};
  const setText=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
  const opacity=(el,value)=>{if(el.style.opacity!==value)el.style.opacity=value;};

  function noPending(){return !!state&&(state.phase==='credit'||state.balance<state.amount);}
  function readout() {
    if(!result)return;
    const values=result.metrics.map(m=>m.value);
    ctx.readout(feedback&&noPending()?ctx.t('c27.lab.output.noPending'):ctx.t('readout',{a:ctx.format(values[0]),c:ctx.format(values[1]),hold:ctx.format(values[2])}));
  }
  function text() {
    if(!result)return;
    const values=result.metrics.map(m=>m.value);
    readout();
    [values[0],values[2],values[1]].forEach((value,i)=>setText(displays[i],ctx.t('balance.'+i,{value:ctx.format(value)})));
    setText(tape,ctx.t('tape',{events:ctx.format(state.snapshot),seconds:ctx.format(values[3],{maximumFractionDigits:2})}));
    weights.forEach((group,j)=>setText(group.querySelector('[data-weight-stamp]'),ctx.format(bundle(state.amount,markerCount,j))));
    [values[0],values[2],values[1]].forEach((value,i)=>shapes[i].forEach((ref,j)=>setText(ref.stamp,ctx.format(bundle(value,bankCounts[i],j)))));
    const next=ctx.t('description',{a:ctx.format(values[0]),c:ctx.format(values[1]),hold:ctx.format(values[2]),recovery:ctx.t('mode.'+state.recovery)});
    if(next!==description){description=next;ctx.describe(next);}
  }
  function load(i,h) {
    if(rendered[i]===h)return;
    rendered[i]=h;
    const n=bankCounts[i],height=n?h/n:0,cx=[-90,0,90][i];
    if(!n||h<=.01){shapes[i].forEach(ref=>opacity(ref.group,'0'));return;}
    // All bundles in a bank share one shape; only their vertical offsets differ.
    const z=DATA.loadBase[i],radius=DATA.loadRadius[i];
    const paths=k.cylinder(cx,11,radius,z,Math.max(.02,height),P,64,.3);
    const seam=k.sideArc(cx,11,radius,z+height*.4,P,48),face=k.topMatrix([cx,16],z+height,P);
    for(let j=0;j<4;j++) {
      const ref=shapes[i][j],on=j<n;
      opacity(ref.group,on?'1':'0');
      if(!on)continue;
      attr(ref.group,'transform',k.translateAlong(P,[0,0,height*j]));
      attr(ref.fill,'d',paths.fill);attr(ref.top,'d',paths.top);attr(ref.edge,'d',paths.outline);
      attr(ref.crease,'d',paths.crease||'');attr(ref.bevel,'d',paths.bevel||'');
      ref.shades.forEach(el=>attr(el,'d',paths.shades[Number(el.dataset.shade)]||''));
      attr(ref.seam,'d',seam);attr(ref.face,'transform',face);
    }
  }
  function draw() {
    if(x!==drawnX) {
      const shift=k.translateAlong(P,[x,0,0]),share=x/90;
      for(const el of carriage)attr(el,'transform',shift);
      paintOrder.sort((a,b)=>(a.key+a.lift*share)-(b.key+b.lift*share));
      if(paintOrder.some((item,i)=>item!==lastPaint[i])) {
        const fragment=document.createDocumentFragment();
        for(const item of paintOrder)fragment.appendChild(item.el);
        machine.appendChild(fragment);lastPaint=[...paintOrder];
      }
      drawnX=x;
    }
    level.forEach((h,i)=>load(i,h));
    needles.forEach((el,j)=>{
      const h=level[j?2:0];
      if(h===drawnNeedles[j])return;
      const angle=h/12*4-2;
      attr(el,'d',`M0 0L${Math.sin(angle)*11} ${-Math.cos(angle)*11}`);drawnNeedles[j]=h;
    });
    // One turn illustrates replay; very quick replays use a legible slow-motion feed.
    const angle=ctx.reduced()?0:replayPhase;
    if(angle!==drawnReplay) {
      const [cx,cy,z]=DATA.replayKnob;
      attr(pointer,'d',k.lineOnTop([cx,cy],[cx+Math.cos(angle)*3,cy+Math.sin(angle)*3],z,P));drawnReplay=angle;
    }
  }
  function destination(mode=state?.recovery) {
    if(!state||state.balance<state.amount)return 0;
    if(state.phase==='credit'||mode==='resume')return 90;
    return mode==='cancel'?-90:0;
  }
  function needsFrame() {
    return touring&&!ctx.reduced()||x!==(preview===null?target:preview)||drawnX!==x||
      level.some((v,i)=>v!==wants[i]||rendered[i]!==v)||
      drawnNeedles[0]!==level[0]||drawnNeedles[1]!==level[2]||drawnReplay!==(ctx.reduced()?0:replayPhase);
  }
  function tick(now) {
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced();
    if(touring&&!calm) {
      clock+=dt;
      const speed=Math.PI*2/Math.max(1.4,result?.metrics[3].value||1.4);
      replaySpeed+=(speed-replaySpeed)*(1-Math.exp(-dt/.4));
      replayPhase=(replayPhase+replaySpeed*dt)%(Math.PI*2);
      target=state&&state.balance>=state.amount?(clock%7<3.5?0:destination()):0;
    }
    const want=preview===null?target:preview,follow=calm?1:1-Math.exp(-dt/.28);
    x+=(want-x)*follow;if(Math.abs(x-want)<.01)x=want;
    for(let i=0;i<3;i++)level[i]=Math.abs(wants[i]-level[i])<.01?wants[i]:level[i]+(wants[i]-level[i])*follow;
    draw();frame=visible&&needsFrame()?requestAnimationFrame(tick):0;
  }
  function run(){if(!frame&&visible&&needsFrame()){last=0;frame=requestAnimationFrame(tick);}}
  function quiet(delay=3600) {
    touring=false;clearTimeout(timer);target=destination();run();
    timer=setTimeout(()=>{if(!hover&&!focused&&!gesture&&!ctx.reduced()){touring=true;clock=0;run();}},delay);
  }
  function select(mode) {
    if(mode===selected)return;
    selected=mode;
    choices.forEach(el=>el.toggleAttribute('data-on',Number(el.dataset.choice)===modes.indexOf(mode)));
  }
  function choose(mode) {
    if(mode===null)return;
    preview=null;quiet();select(mode);
    if(mode===state?.recovery){feedback=noPending();readout();if(feedback)ctx.announce(ctx.t('c27.lab.output.noPending'));return;}
    if(ctx.set({recovery:mode})){feedback=noPending();readout();ctx.announce(feedback?ctx.t('c27.lab.output.noPending'):ctx.t('mode.'+mode));}
    else select(state?.recovery||'resume');
  }
  function choiceAt(e) {
    const part=e.target?.closest?.('[data-choice], [data-hit-recovery], [data-load]');
    if(!part||!stage.contains(part))return null;
    if(part.hasAttribute('data-choice'))return modes[Number(part.dataset.choice)];
    if(part.hasAttribute('data-hit-recovery'))return part.dataset.hitRecovery;
    return modes[Number(part.dataset.load)];
  }
  function enter(e){if(e.pointerType!=='touch'){hover=true;quiet();}}
  function move(e) {
    if(gesture&&gesture.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6)gesture.moved=true;
    if(e.pointerType==='touch')return;
    hover=true;quiet();
    const mode=choiceAt(e);
    select(mode||state?.recovery||'resume');preview=mode===null?null:destination(mode);feedback=mode!==null&&noPending();readout();run();
  }
  function leave(e){if(e?.pointerType==='touch'&&!gesture&&!hover)return;hover=false;gesture=null;preview=null;feedback=false;readout();select(state?.recovery||'resume');quiet();}
  function press(e) {
    const mode=choiceAt(e);
    if(mode===null)return;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,mode,moved:false};
    quiet();
    if(e.pointerType!=='touch'){select(mode);preview=destination(mode);feedback=noPending();readout();run();}
  }
  function release(e) {
    if(!gesture||gesture.id!==e.pointerId)return;
    const start=gesture;gesture=null;
    const mode=choiceAt(e);
    if(!start.moved&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<6&&mode===start.mode) {
      choose(mode);stage.focus({preventScroll:true});
    }
    else {preview=null;feedback=false;readout();select(state?.recovery||'resume');quiet();}
  }
  function cancel(e){if(!gesture||gesture.id!==e.pointerId)return;gesture=null;preview=null;feedback=false;readout();select(state?.recovery||'resume');quiet();}
  function focus(){focused=true;quiet();}
  function blur(){focused=false;feedback=false;readout();quiet();}
  function key(e) {
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    let i=modes.indexOf(state?.recovery||'resume');
    if(e.key==='ArrowLeft'||e.key==='ArrowDown')i=Math.max(0,i-1);
    else if(e.key==='ArrowRight'||e.key==='ArrowUp')i=Math.min(2,i+1);
    else if(e.key==='Home')i=0;
    else if(e.key==='End')i=2;
    else if(e.key==='Enter'||e.key===' ')i=(i+1)%3;
    else if(e.key==='Escape'){gesture=null;preview=null;feedback=false;readout();select(state?.recovery||'resume');quiet();return;}
    else return;
    e.preventDefault();choose(modes[i]);
  }
  function motionChanged(){quiet();if(ctx.reduced()){x=destination();level=[...wants];draw();}}
  const events={pointerenter:enter,pointermove:move,pointerleave:leave,pointerdown:press,pointerup:release,pointercancel:cancel,focus,blur,keydown:key};
  for(const [name,handler] of Object.entries(events))stage.addEventListener(name,handler);
  still.addEventListener('change',motionChanged);
  const observer=new IntersectionObserver(entries=>{
    visible=entries[entries.length-1].isIntersecting;
    if(visible)run();else{cancelAnimationFrame(frame);frame=0;}
  },{rootMargin:'120px 0px'});
  observer.observe(stage);
  function update(s,r) {
    if(!s||!r)return;
    state=s;result=r;preview=null;feedback=false;select(s.recovery);
    const hasTransfer=s.balance>=s.amount;
    markerCount=Math.min(4,Math.ceil(s.amount/10));
    weights.forEach((el,j)=>{opacity(el,hasTransfer&&j<markerCount?'1':'0');el.querySelector('.iso-solid').toggleAttribute('data-lit',j===markerCount-1);});
    const values=[r.metrics[0].value,r.metrics[2].value,r.metrics[1].value];
    const counts=values.map(v=>Math.min(4,Math.ceil(v/s.amount)));
    counts.forEach((n,i)=>{if(n!==bankCounts[i])rendered[i]=-1;});bankCounts=counts;
    wants=values.map(v=>v/s.balance*12);
    target=destination();text();
    if(ctx.reduced()){x=target;level=[...wants];draw();}
    quiet(1400);
  }
  return {update,relocalize(){text();ctx.announce('');},destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();still.removeEventListener('change',motionChanged);for(const [name,handler] of Object.entries(events))stage.removeEventListener(name,handler);}};
}
