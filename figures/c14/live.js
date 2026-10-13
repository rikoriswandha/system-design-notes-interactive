export default function mount(root,ctx,K,DATA) {
  const stage=ctx.stage, {k}=K;
  const variants=[...root.querySelectorAll('[data-variant]')];
  const gauges=[0,1].map(i=>root.querySelector(`[data-gauge="${i}"]`));
  const wheels=[0,1,2].map(i=>root.querySelector(`[data-wheel="${i}"]`));
  const gates=[...root.querySelectorAll('[data-gate]')];
  const stack=root.querySelector('[data-depth-stack]');
  const nodes=DATA.items.map((_,i)=>root.querySelector(`[data-sort="${i}"]`));
  let order=DATA.items.map((_,i)=>i),nextOrder=order.slice();
  const depth=new Float64Array(DATA.items.length),placed=[NaN,NaN],drawnAngles=[NaN,NaN,NaN];
  const compareDepth=(a,b)=>depth[a]-depth[b]||a-b;
  let state=ctx.state,result=ctx.result,choice=0,preview=null,visible=false,hover=false,focus=false;
  let frame=0,last=0,clock=0,timer=0,touring=false,dead=false;
  let values=[0,0],targets=[0,0],angles=[0,0,0];
  let variantCount=-1,lastDescription='',gesture=null,blockedClick=false;
  const meter=DATA.gauges[1],meterOrigin=k.iso([meter.x,0,5],DATA.P);
  const xAxis=k.axisVector(DATA.P,[1,0,0]),yAxis=k.axisVector(DATA.P,[0,1,0]);
  const determinant=xAxis[0]*yAxis[1]-xAxis[1]*yAxis[0];
  const events=[];
  const on=(type,fn)=>{stage.addEventListener(type,fn);events.push([type,fn]);};
  const fmt=n=>ctx.format(n,{maximumFractionDigits:1});
  function read() {
    if(!state||!result)return;
    const n=[result.metrics[0].value,result.metrics[1].value,result.metrics[2].value,result.metrics[3].value];
    ctx.readout(preview===null?ctx.t(`read.${choice}`,{n:fmt(n[choice])}):ctx.t('preview',{n:fmt(preview)}));
    if(stage.getAttribute('aria-valuenow')!==String(state.hit))stage.setAttribute('aria-valuenow',String(state.hit));
  }
  function describe() {
    if(!state)return;
    const text=ctx.t('describe',{hit:fmt(state.hit),workers:fmt(state.workers),variants:fmt(state.variants)});
    if(text!==lastDescription){ctx.describe(text);lastDescription=text;}
  }
  function select(i,announce=false) { if(choice!==i){choice=i;read();if(announce)ctx.announce(ctx.t(`phase.${i}`));} }
  function draw() {
    const moved=values[0]!==placed[0]||values[1]!==placed[1];
    for(let i=0;i<2;i++) if(values[i]!==placed[i]) gauges[i].setAttribute('transform',k.translateAlong(DATA.P,[75*values[i],0,0]));
    if(values[0]!==placed[0]) for(const gate of gates) gate.setAttribute('transform',k.translateAlong(DATA.P,[0,0,3*values[0]]));
    if(moved) {
      for(let i=0;i<DATA.items.length;i++) {
        const item=DATA.items[i],share=item.piece==='load'?values[0]:item.piece==='hit'?values[1]:0;
        depth[i]=item.key+item.lift*share;
      }
      nextOrder.sort(compareDepth);
      if(nextOrder.some((i,n)=>i!==order[n])) {
        const fragment=document.createDocumentFragment();
        for(const i of nextOrder) fragment.appendChild(nodes[i]);
        stack.appendChild(fragment);
      }
      const prior=order;order=nextOrder;nextOrder=prior;
      placed[0]=values[0];placed[1]=values[1];
    }
    for(let i=0;i<3;i++) if(angles[i]!==drawnAngles[i]) {
      const [x,y,z,r]=DATA.wheels[i],a=angles[i];
      wheels[i].setAttribute('d',k.lineOnTop([x,y],[x+r*Math.cos(a),y+r*Math.sin(a)],z,DATA.P));drawnAngles[i]=a;
    }
  }
  function tick(now) {
    frame=0;if(dead||!visible)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced();
    if(touring&&!calm&&state&&result) {
      clock+=dt;select(Math.floor(clock/2.4)%4);
      const work=result.bars[0].value;
      angles[0]+=dt*.6*Math.min(2,work/Math.max(1,state.workers*2));
      const playback=dt*.8*Math.sqrt(result.metrics[2].value/300);
      angles[1]+=playback*(state.hit/100);
      angles[2]+=playback*(1-state.hit/100);
    }
    let moving=false;
    const ease=calm?1:1-Math.exp(-dt/.22);
    for(let i=0;i<2;i++) {
      const to=targets[i],n=values[i]+(to-values[i])*ease;
      if(Math.abs(n-to)<.0001)values[i]=to;
      else {values[i]=n;moving=true;}
    }
    draw();
    if(moving||(touring&&!calm))run();
  }
  function run(){if(!frame&&visible&&!dead){frame=requestAnimationFrame(tick);}}
  function resume(delay){clearTimeout(timer);timer=setTimeout(()=>{if(!dead&&!hover&&!focus&&!ctx.reduced()){touring=true;clock=choice*2.4;last=0;run();}},delay);}
  function hold(){touring=false;clearTimeout(timer);last=0;run();}
  function commit(hit){preview=null;ctx.set({hit:Math.max(0,Math.min(99,Math.round(hit)))});describe();}
  const hitControl=event=>event.target.closest?.('[data-hit-control]');
  function pointer(event) {
    if(gesture&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>=6)blockedClick=true;
    if(!hitControl(event)){if(preview!==null){preview=null;read();}return;}
    const matrix=ctx.svg.getScreenCTM();
    if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const dx=point.x-meterOrigin[0],dy=point.y-meterOrigin[1];
    const x=(dx*yAxis[1]-dy*yAxis[0])/determinant;
    preview=Math.max(0,Math.min(99,Math.round(x/75*100)));
    select(3);hold();read();
  }
  on('pointerenter',()=>{hover=true;hold();});
  on('pointermove',pointer);
  on('pointerdown',event=>{
    blockedClick=!hitControl(event);
    gesture=blockedClick?null:{x:event.clientX,y:event.clientY,id:event.pointerId};
    if(!blockedClick){pointer(event);stage.focus({preventScroll:true});}
  });
  on('pointerup',event=>{
    if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>=6)blockedClick=true;
    gesture=null;
  });
  on('pointercancel',()=>{gesture=null;blockedClick=true;preview=null;read();});
  on('click',event=>{
    if(blockedClick||!hitControl(event))return;
    pointer(event);
    if(preview!==null)commit(preview);
  });
  on('pointerleave',()=>{hover=false;gesture=null;blockedClick=true;preview=null;read();resume(3600);});
  on('focus',()=>{focus=true;hold();describe();});
  on('blur',()=>{focus=false;preview=null;read();resume(3600);});
  on('keydown',event=>{
    let hit=state?.hit;if(hit==null)return;
    if(event.key==='ArrowRight'||event.key==='ArrowUp')hit+=event.shiftKey?10:1;
    else if(event.key==='ArrowLeft'||event.key==='ArrowDown')hit-=event.shiftKey?10:1;
    else if(event.key==='Home')hit=0;
    else if(event.key==='End')hit=99;
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();hold();if(preview!==null)commit(preview);else select((choice+1)%4,true);return;}
    else if(event.key==='Escape'){event.preventDefault();preview=null;select(0);read();return;}
    else return;
    event.preventDefault();hold();select(3);commit(hit);
  });
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){last=0;run();}else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});
  observer.observe(stage);
  function update(s,r) {
    state=s;result=r;if(!s||!r)return;
    if(s.variants!==variantCount){variants.forEach(el=>el.style.display=Number(el.dataset.variant)<s.variants?'':'none');variantCount=s.variants;}
    targets=[Math.min(1,r.bars[0].value/Math.max(1,s.workers*2)),s.hit/100];
    if(ctx.reduced()){values=[...targets];draw();}
    preview=null;read();describe();run();
  }
  update(state,result);resume(1400);
  return {update,relocalize(){read();describe();ctx.announce('');},destroy(){dead=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();events.forEach(([type,fn])=>stage.removeEventListener(type,fn));}};
}
