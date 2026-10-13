export default function mount(root, ctx, K, DATA) {
  const {k}=K, {P}=DATA, stage=ctx.stage;
  const ec=[...root.querySelectorAll('[data-scheme="ec"]')];
  const replicas=[...root.querySelectorAll('[data-scheme="replica"]')];
  const channels=[...root.querySelectorAll('[data-channel-scheme]')];
  const regulator=root.querySelector('[data-regulator]');
  const capacity=root.querySelector('[data-capacity]'), overhead=root.querySelector('[data-overhead]');
  const input=root.querySelector('[data-input]'),capacityMarker=root.querySelector('[data-capacity-marker]');
  const tolerance=root.querySelector('[data-tolerance]'), survivors=root.querySelector('[data-survivors]');
  const offsets=new Float64Array(12);
  const placedOffsets=new Float64Array(12);
  placedOffsets.fill(NaN);
  const machine=root.querySelector('[data-machine]');
  const orders=Object.fromEntries(Object.entries(DATA.orders).map(([scheme,items])=>[scheme,items.map(item=>({...item,node:root.querySelector(`[data-item="${item.name}"]`),index:item.name.startsWith(scheme+'.')?Number(item.name.split('.')[1]):-1,depth:item.key}))]));
  let previousOrder=[];
  let state=null,result=null,active=ec,selected=-1,reg=0,regTarget=0,volume=0,volumeTarget=0;
  let frame=0,last=0,clock=0,visible=true,held=false,hovered=false,focused=false,tour=false,timer=0,disposed=false,phase='';
  let placedReg=NaN,placedVolume=NaN,orderDirty=true,lastDescription='';
  const listeners=[];
  const listen=(name,fn)=>{stage.addEventListener(name,fn);listeners.push([name,fn]);};
  const fmt=(v)=>ctx.format(v,{maximumFractionDigits:1});
  const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  function words() {
    if(!result) return;
    setText(capacity,ctx.t('capacity',{value:fmt(result.metrics[0].value)}));
    setText(overhead,ctx.t('overhead',{value:fmt(result.metrics[1].value)}));
    setText(input,ctx.t('input',{value:fmt(state.pb)}));
    setText(tolerance,ctx.t('tolerance',{value:fmt(result.metrics[2].value)}));
    setText(survivors,ctx.t('survivors',{value:fmt(result.bars[0].value),max:fmt(result.bars[0].max)}));
    const recoverable=typeof result.metrics[3].value==='number';
    ctx.readout(recoverable?ctx.t('repair',{bandwidth:fmt(state.repair),hours:fmt(result.metrics[3].value)}):ctx.t('lost',{bandwidth:fmt(state.repair)}));
    const description=ctx.t('description',{failed:fmt(state.failed),tolerance:fmt(result.metrics[2].value),remaining:fmt(result.bars[0].value),total:fmt(result.bars[0].max),bandwidth:fmt(state.repair)});
    if(description!==lastDescription){ctx.describe(description);lastDescription=description;}
  }
  function run(){if(!frame&&visible&&!disposed){last=0;frame=requestAnimationFrame(tick);}}
  function arm(delay=3600) {
    clearTimeout(timer);
    if(!ctx.reduced())timer=setTimeout(()=>{if(!held&&!hovered&&!focused){tour=true;clock=0;run();}},delay);
  }
  function pause(){held=true;tour=false;selected=-1;clearTimeout(timer);run();}
  function release(){
    held=hovered||focused;selected=-1;tour=false;clearTimeout(timer);
    if(!held)arm();
    run();
  }
  function paintOrder() {
    const order=orders[state.scheme];
    for(const item of order)item.depth=item.key+item.lift*(item.name==='regulator'?reg/147:item.index<0?0:offsets[item.index]/30);
    order.sort((a,b)=>a.depth-b.depth);
    if(order.length!==previousOrder.length||order.some((item,i)=>item.node!==previousOrder[i])) {
      const fragment=document.createDocumentFragment();
      previousOrder=order.map(item=>item.node);
      for(const item of order)fragment.append(item.node);
      machine.append(fragment);
    }
  }
  function tick(now) {
    frame=0;
    if(!state||!visible||disposed)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced();
    if(calm)tour=false;
    if(tour)clock+=dt;
    const n=result.bars[0].max,failed=Math.min(n,state.failed);
    // The idle service inspection travels only over surviving carriers. It never
    // changes a control or implies that redundancy has restored missing bytes.
    const inspected=tour&&failed<n?failed+Math.floor(clock/1.8)%(n-failed):selected;
    let moving=false,geometryMoved=false;
    for(let i=0;i<active.length;i++) {
      const target=i<failed?30:(i===inspected?5:0);
      offsets[i]=calm?target:offsets[i]+(target-offsets[i])*(1-Math.exp(-dt/DATA.EASE.tray));
      if(Math.abs(offsets[i]-target)<0.015)offsets[i]=target;else moving=true;
      if(offsets[i]!==placedOffsets[i]){
        active[i].setAttribute('transform',k.translateAlong(P,[0,offsets[i],0]));
        placedOffsets[i]=offsets[i];geometryMoved=true;
      }
    }
    reg=calm?regTarget:reg+(regTarget-reg)*(1-Math.exp(-dt/DATA.EASE.regulator));
    if(Math.abs(reg-regTarget)<0.015)reg=regTarget;else moving=true;
    if(reg!==placedReg){regulator.setAttribute('transform',k.translateAlong(P,[reg,0,0]));placedReg=reg;geometryMoved=true;}
    volume=calm?volumeTarget:volume+(volumeTarget-volume)*(1-Math.exp(-dt/DATA.EASE.regulator));
    if(Math.abs(volume-volumeTarget)<0.015)volume=volumeTarget;else moving=true;
    if(volume!==placedVolume){capacityMarker.setAttribute('transform',k.translateAlong(P,[volume,0,0]));placedVolume=volume;}
    if(geometryMoved||orderDirty){paintOrder();orderDirty=false;}
    if(moving||(tour&&failed<n))frame=requestAnimationFrame(tick);
  }
  function update(s,r) {
    if(!s||!r)return;
    const changedScheme=state&&state.scheme!==s.scheme;
    state=s;result=r;active=s.scheme==='ec'?ec:replicas;
    for(const el of ec){const display=s.scheme==='ec'?'':'none';if(el.style.display!==display)el.style.display=display;}
    for(const el of replicas){const display=s.scheme==='replica'?'':'none';if(el.style.display!==display)el.style.display=display;}
    for(const el of channels){const display=el.dataset.channelScheme===s.scheme?'':'none';if(el.style.display!==display)el.style.display=display;}
    const lostCount=Math.min(r.bars[0].max,s.failed);
    active.forEach((el,i)=>{const value=String(i<lostCount);if(el.dataset.failed!==value)el.dataset.failed=value;});
    if(changedScheme){offsets.fill(0);placedOffsets.fill(NaN);orderDirty=true;}
    regTarget=(s.repair-10)/990*147;
    volumeTarget=s.pb/200*90;
    phase=typeof r.metrics[3].value==='number'?'recoverable':'unrecoverable';
    words();
    if(ctx.reduced()){cancelAnimationFrame(frame);frame=0;tick(performance.now());}else run();
  }
  function commit(values){
    const before=phase;
    if(ctx.set(values)&&phase!==before)ctx.announce(ctx.t('phase.'+phase));
  }
  function nearest(event) {
    const carrier=event.target.closest('[data-tray]');
    if(carrier&&carrier.dataset.scheme===state.scheme)return Number(carrier.dataset.tray);
    if(event.target.closest('[data-item="stand.console"],[data-item="stand.regulator-rail"],[data-item="regulator"]'))return -1;
    const box=ctx.svg.getBoundingClientRect(),x=(event.clientX-box.left)*600/box.width,y=(event.clientY-box.top)*380/box.height;
    const points=state.scheme==='ec'?DATA.positions:[[0,37,22],[0,37,55],[0,37,88]];
    let best=-1,d=45;
    points.forEach((p,i)=>{const q=k.iso([p[0],p[1]+offsets[i],p[2]],P),distance=Math.hypot(q[0]-x,q[1]-y);if(distance<d){best=i;d=distance;}});
    return best;
  }
  listen('pointerenter',()=>{hovered=true;pause();});
  listen('pointermove',event=>{if(!state)return;tour=false;selected=nearest(event);run();});
  listen('pointerleave',()=>{hovered=false;release();});
  listen('pointerdown',()=>{pause();stage.focus({preventScroll:true});});
  listen('click',event=>{
    if(!state)return;
    pause();
    const carrier=event.target.closest('[data-tray]');
    if(carrier&&carrier.dataset.scheme===state.scheme){
      commit({failed:Math.min(6,Number(carrier.dataset.tray)+1)});
    } else if(event.target.closest('[data-regulator],[data-item="stand.regulator-rail"]')){
      const box=ctx.svg.getBoundingClientRect(),axis=k.axisVector(P,[1,0,0]),origin=k.iso([-79.5,68,10],P);
      const dx=(event.clientX-box.left)*600/box.width-origin[0],dy=(event.clientY-box.top)*380/box.height-origin[1];
      const position=Math.max(0,Math.min(147,(dx*axis[0]+dy*axis[1])/(axis[0]**2+axis[1]**2)));
      const repair=Math.max(10,Math.min(1000,Math.round((10+position/147*990)/10)*10));
      commit({repair});
    }
    stage.focus({preventScroll:true});
  });
  listen('focus',()=>{focused=true;pause();});listen('blur',()=>{focused=false;release();});
  listen('keydown',event=>{
    if(!state||event.ctrlKey||event.metaKey||event.altKey)return;
    let values=null;
    if(event.key==='ArrowLeft')values={failed:Math.max(0,state.failed-1)};
    if(event.key==='ArrowRight')values={failed:Math.min(6,state.failed+1)};
    if(event.key==='ArrowUp')values={repair:Math.min(1000,state.repair+(event.shiftKey?100:10))};
    if(event.key==='ArrowDown')values={repair:Math.max(10,state.repair-(event.shiftKey?100:10))};
    if(event.key==='Home')values={failed:0};
    if(event.key==='End')values={failed:6};
    if(event.key===' '||event.key==='Enter')values={scheme:state.scheme==='ec'?'replica':'ec'};
    if(event.key==='Escape'){event.preventDefault();pause();return;}
    if(values){event.preventDefault();pause();commit(values);}
  });
  const observer=new IntersectionObserver(entries=>{
    visible=entries[entries.length-1].isIntersecting;
    if(visible){run();if(!held)arm(1400);}else{cancelAnimationFrame(frame);frame=0;clearTimeout(timer);}
  },{rootMargin:'120px 0px'});
  observer.observe(stage);
  arm(1400);
  return {update,relocalize(){words();ctx.announce('');},destroy(){disposed=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();listeners.forEach(([name,fn])=>stage.removeEventListener(name,fn));}};
}
