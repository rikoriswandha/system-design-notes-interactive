export default function mount(root, ctx, K, DATA) {
  const stage=ctx.stage, dies=[...root.querySelectorAll('[data-die]')];
  const jaw=root.querySelector('[data-capacity]'), bypass=root.querySelector('[data-bypass]'), cache=root.querySelector('[data-cache]'), db=root.querySelector('[data-db]');
  const card=root.querySelector('[data-card]'), code=root.querySelector('[data-code]');
  const faces=[...root.querySelectorAll('[data-wheel-face]')];
  const wheels=dies.map(el=>({el,index:Number(el.dataset.die),core:root.querySelector(`[data-core="${el.dataset.die}"]`)}));
  let state, result, frame=0, last=0, visible=true, hovered=false, focused=false, clock=0, idleAt=performance.now()+1400, phase=0, preview=null, pressed=null;
  let fill=0, client=0, hit=0, length=7, feed=0, feedClock=0, lever=0, paintedLever=null, description='', targets={fill:0,client:0,hit:0,lever:0};
  const painted={fill:null,client:null,hit:null,feed:null,length:null,spin:null};
  const events=[];
  const listen=(type,fn)=>{stage.addEventListener(type,fn);events.push([type,fn]);};
  function attribute(node,name,value){const text=String(value);if(node.getAttribute(name)!==text)node.setAttribute(name,text);}
  function text(node,value){if(node.textContent!==value)node.textContent=value;}
  const leverParts=[['arm',DATA.arm,...DATA.armRange],['grip',DATA.grip,...DATA.gripRange]].map(([name,polygon,s0,s1])=>{
    const group=root.querySelector(`[data-lever="${name}"]`);
    return {polygon,s0,s1,fill:group.querySelector('.iso-fill'),top:group.querySelector('.iso-top'),crease:group.querySelector('.iso-crease'),outline:group.querySelector('.iso-edge'),shades:[0,1,2,3].map(i=>group.querySelector(`[data-shade="${i}"]`))};
  });
  function drawLever(){
    if(lever===paintedLever)return;
    const c=Math.cos(lever),s=Math.sin(lever);
    for(const part of leverParts){
      const polygon=part.polygon.map(([u,v])=>[u*c-v*s,u*s+v*c]);
      const paths=K.G.prismOf(DATA.leverF,polygon,part.s0,part.s1,DATA.P);
      for(const key of ['fill','top','crease','outline'])if(part[key])attribute(part[key],'d',paths[key]||'');
      part.shades.forEach((node,i)=>attribute(node,'d',paths.shades[i]||''));
    }
    paintedLever=lever;
  }
  function say() {
    if(!state||!result)return;
    const values=[ctx.t('usage',{value:ctx.format(result.metrics[0].value,{maximumFractionDigits:2})}),ctx.t('service',{value:ctx.format(result.metrics[1].value)}),ctx.t('database',{value:ctx.format(result.metrics[2].value)}),ctx.t('mappings',{value:ctx.format(result.metrics[3].value)})];
    ctx.readout(values[phase]);
    text(db,ctx.format(result.metrics[2].value));
    text(code,'A'.repeat(state.length));
    attribute(stage,'aria-valuenow',state.length);
  }
  function describe(force=false){
    const next=ctx.t('description',{length:state.length,redirect:state.redirect,hit:state.hit});
    if(force||next!==description){description=next;ctx.describe(next);}
  }
  function draw(){
    if(fill!==painted.fill){attribute(jaw,'transform',K.k.translateAlong(DATA.P,[fill*DATA.jawTravel,0,0]));painted.fill=fill;}
    if(client!==painted.client){attribute(bypass,'transform',K.k.translateAlong(DATA.P,[client*73,0,0]));painted.client=client;}
    if(hit!==painted.hit){attribute(cache,'transform',K.k.translateAlong(DATA.P,[hit*66,0,0]));painted.hit=hit;}
    if(feed!==painted.feed){attribute(card,'transform',K.k.translateAlong(DATA.P,[0,feed,0]));painted.feed=feed;}
    if(length!==painted.length){
      for(const wheel of wheels){
        const alpha=Math.max(0,Math.min(1,length-wheel.index));
        attribute(wheel.el,'opacity',alpha);
        attribute(wheel.core,'opacity',1-alpha);
      }
      painted.length=length;
    }
    const spin=ctx.reduced()?0:feedClock*8;
    if(spin!==painted.spin){faces.forEach(el=>attribute(el,'transform',`rotate(${spin})`));painted.spin=spin;}
    drawLever();
  }
  function tick(now){
    frame=0;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced(), tour=!calm&&!hovered&&!focused&&now>=idleAt;
    if(tour){clock+=dt;const next=Math.floor(clock/2.8)%4;if(next!==phase){phase=next;say();}}
    const a=calm?1:1-Math.exp(-dt/.22);
    if(tour)feedClock+=dt*(.5+Math.log1p(result.table.rows[1][1])/10);
    const feedTarget=tour?1.5*(1-Math.cos(feedClock)):0;
    feed+=(feedTarget-feed)*a;
    if(Math.abs(feed-feedTarget)<.0001)feed=feedTarget;
    fill+=(targets.fill-fill)*a;client+=(targets.client-client)*a;hit+=(targets.hit-hit)*a;
    if(Math.abs(fill-targets.fill)<.0001)fill=targets.fill;
    if(Math.abs(client-targets.client)<.0001)client=targets.client;
    if(Math.abs(hit-targets.hit)<.0001)hit=targets.hit;
    lever+=(targets.lever-lever)*a;
    if(Math.abs(lever-targets.lever)<.0001)lever=targets.lever;
    const lengthTarget=preview??state.length;
    length+=(lengthTarget-length)*a;
    if(Math.abs(length-lengthTarget)<.0001)length=lengthTarget;
    draw();
    if(visible&&(tour||lever!==targets.lever||feed!==feedTarget||fill!==targets.fill||client!==targets.client||hit!==targets.hit||length!==lengthTarget))frame=requestAnimationFrame(tick);
  }
  let timer=0;
  const run=()=>{if(visible&&!frame&&state){last=0;frame=requestAnimationFrame(tick);}};
  const resume=()=>{if(!hovered&&!focused&&!ctx.reduced())run();};
  function quiet(){idleAt=performance.now()+3600;clearTimeout(timer);timer=setTimeout(resume,3600);run();}
  function actionAt(target){
    if(target.closest('[data-lever]'))return {redirect:state.redirect==='301'?'302':'301'};
    const slot=target.closest('[data-length-slot],[data-die],[data-core]');
    if(!slot)return null;
    const index=Number(slot.getAttribute('data-length-slot')??slot.getAttribute('data-die')??slot.getAttribute('data-core'));
    return {length:Math.max(4,Math.min(9,index+1))};
  }
  listen('pointerenter',()=>{hovered=true;quiet();});
  listen('pointermove',e=>{
    if(pressed&&pressed.id===e.pointerId&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)>=6)pressed.moved=true;
    preview=state?actionAt(e.target)?.length??null:null;quiet();
  });
  listen('pointerleave',()=>{hovered=false;pressed=null;preview=null;quiet();});
  listen('pointerdown',e=>{
    const action=state&&e.button===0?actionAt(e.target):null;
    pressed=action?{id:e.pointerId,x:e.clientX,y:e.clientY,action,moved:false}:null;
    preview=action?.length??null;quiet();
  });
  listen('pointercancel',()=>{pressed=null;preview=null;hovered=false;quiet();});
  listen('pointerup',e=>{
    const held=pressed;pressed=null;preview=null;quiet();
    if(held&&held.id===e.pointerId&&!held.moved&&Math.hypot(e.clientX-held.x,e.clientY-held.y)<6)ctx.set(held.action);
  });
  listen('focus',()=>{focused=true;quiet();if(state)describe();});
  listen('blur',()=>{focused=false;pressed=null;preview=null;quiet();});
  listen('keydown',e=>{
    if(!state)return;
    let change=null;
    if(e.key==='ArrowRight'||e.key==='ArrowUp')change={length:Math.min(9,state.length+1)};
    if(e.key==='ArrowLeft'||e.key==='ArrowDown')change={length:Math.max(4,state.length-1)};
    if(e.key==='Home')change={length:4};if(e.key==='End')change={length:9};
    if(e.key===' '||e.key==='Enter')change={redirect:state.redirect==='301'?'302':'301'};
    if(e.key==='Escape'){pressed=null;preview=null;phase=0;say();quiet();e.preventDefault();return;}
    if(change){e.preventDefault();pressed=null;preview=null;quiet();ctx.set(change);}
  });
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});observer.observe(stage);
  timer=setTimeout(resume,1400);
  return {
    update(s,r){state=s;result=r;if(!s||!r)return;targets={fill:Math.min(1,r.metrics[0].value/100),client:1-r.table.rows[2][1]/100,hit:s.hit/100,lever:s.redirect==='301'?.23:0};root.dataset.fill=String(r.metrics[0].value);root.dataset.service=String(r.metrics[1].value);root.dataset.db=String(r.metrics[2].value);root.dataset.length=String(s.length);say();describe();run();},
    relocalize(){say();if(state)describe(true);ctx.announce('');},
    destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();events.forEach(([type,fn])=>stage.removeEventListener(type,fn));}
  };
}
