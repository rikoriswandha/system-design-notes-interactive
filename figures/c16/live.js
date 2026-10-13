export default function mount(root, ctx, K, DATA) {
  const {k}=K, {P}=DATA;
  const stage=ctx.stage,circle=root.querySelector('[data-circle]');
  const gridPattern=root.querySelector('[data-grid-pattern]'),gridCell=root.querySelector('[data-grid-cell]'),gridSocket=root.querySelector('[data-grid-socket]');
  const slider=root.querySelector('[data-slider]'),gate=root.querySelector('[data-gate]');
  const stylus=root.querySelector('[data-stylus]'),arm=root.querySelector('[data-arm]');
  const armRefs={
    fill:arm.querySelector('.iso-fill'),
    top:arm.querySelector('.iso-top'),
    crease:arm.querySelector('.iso-crease'),
    bevel:arm.querySelector('.iso-bevel'),
    outline:arm.querySelector('.iso-edge'),
    shades:[0,1,2,3].map(i=>arm.querySelector(`[data-shade="${i}"]`)),
    ticks:arm.querySelector('[data-arm-ticks]')
  };
  const meters=[...root.querySelectorAll('[data-meter]')];
  const dials=DATA.dials.map(d=>({...d,node:root.querySelector(`[data-dial="${d.name}"]`),value:0,target:0}));
  const compassNodes=new Map(DATA.compassOrder.front.map(name=>[name,root.querySelector(`[data-item="${name}"]`)]));
  let depthSide=null;
  let state=ctx.state,result=ctx.result,phase=0,preview=null;
  let radius=41.5,goal=41.5,cache=0,cacheGoal=0,values=[0,0,0],targets=[0,0,0];
  let bearing=0,paintedRadius=-1,paintedBearing=-1,circleRadius=-1;
  let lastReadout=null,gridSpan=-1;
  let paintedCache=-1;
  const paintedValues=[-1,-1,-1];
  for(const d of dials)d.painted=-1;
  let gesture=null;
  let raf=0,last=0,visible=false,clock=0,tour=false,held=false,timer=0,destroyed=false;
  const listeners=[];
  function on(type,fn){stage.addEventListener(type,fn);listeners.push([type,fn]);}
  const format=n=>ctx.format(n,{maximumFractionDigits:0});
  function say(){
    if(!result)return;
    const adjusting=Math.abs(radius-goal)>0.01||Math.abs(cache-cacheGoal)>0.01||values.some((v,i)=>Math.abs(v-targets[i])>0.001)||dials.some(d=>Math.abs(d.target-d.value)>0.001);
    const key=preview!==null?'preview':adjusting?'adjusting':phase+':'+result.metrics[phase].value;
    if(lastReadout===key)return;
    lastReadout=key;
    if(preview!==null){ctx.readout(ctx.t('preview'));return;}
    if(adjusting){ctx.readout(ctx.t('adjusting'));return;}
    ctx.readout(ctx.t('read.'+phase,{n:format(result.metrics[phase].value)}));
  }
  function describe(){if(state&&result){stage.setAttribute('aria-valuenow',String(state.radius));ctx.describe(ctx.t('description',{radius:ctx.format(state.radius,{maximumFractionDigits:1}),cells:format(result.metrics[0].value),candidates:format(result.metrics[1].value),results:format(result.metrics[2].value),lookups:format(result.metrics[3].value)}));}}
  function draw(){
    if(radius!==circleRadius){circle.setAttribute('d',k.ring(0,0,radius,12.2,P,128));circleRadius=radius;}
    const sin=Math.sin(bearing),cos=Math.cos(bearing);
    const side=k.depthOf([sin,cos,0],P)<k.depthOf([0,0,0],P)?'back':'front';
    if(depthSide!==side){
      const fragment=document.createDocumentFragment();
      for(const name of DATA.compassOrder[side])fragment.append(compassNodes.get(name));
      ctx.svg.append(fragment);
      depthSide=side;
    }
    const transform=k.translateAlong(P,[(radius+DATA.armOffset)*sin,(radius+DATA.armOffset)*cos-DATA.carriageRest,0]);
    if(radius!==paintedRadius||bearing!==paintedBearing){
      slider.setAttribute('transform',transform);
      stylus.setAttribute('transform',k.translateAlong(P,[radius*sin,radius*cos-41.5,0]));
    }
    if(radius!==paintedRadius||bearing!==paintedBearing){
      const rotate=([x,y])=>[x*cos+y*sin,-x*sin+y*cos];
      const ring=k.roundedPlan({x:-3,y:0,w:6,d:radius+DATA.armMargin,r:1},4).map(rotate);
      const shape=k.extrude(ring,47,4,P,{bevel:0.4});
      for(const name of ['fill','top','crease','bevel','outline'])armRefs[name].setAttribute('d',shape[name]||'');
      for(let i=0;i<4;i++)armRefs.shades[i].setAttribute('d',shape.shades[i]||'');
      const marks=[];
      for(let y=3,i=0;y<radius+DATA.armMargin-2;y+=3,i++){
        marks.push(k.lineOnTop(rotate([3,y]),rotate([i%5===0?0.5:1.8,y]),51,P));
      }
      armRefs.ticks.setAttribute('d',marks.join(''));
      paintedRadius=radius;paintedBearing=bearing;
    }
    if(cache!==paintedCache){gate.setAttribute('transform',k.translateAlong(P,[cache,0,0]));paintedCache=cache;}
    meters.forEach((m,i)=>{if(values[i]!==paintedValues[i]){m.setAttribute('transform',k.translateAlong(P,[values[i]*19,0,0]));paintedValues[i]=values[i];}});
    for(const d of dials){
      if(d.value===d.painted)continue;
      const angle=(-0.8+d.value*1.6)*Math.PI;
      d.node.setAttribute('d',k.lineOnTop([d.x,d.y],[d.x+Math.sin(angle)*(d.r-2),d.y-Math.cos(angle)*(d.r-2)],d.z+5.2,P));
      d.painted=d.value;
    }
  }
  function tick(now){
    raf=0;if(destroyed||!visible)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    if(tour&&!ctx.reduced()&&!held){clock+=dt;const next=Math.floor(clock/2)%4;if(next!==phase){phase=next;say();}}
    const ease=ctx.reduced()?1:1-Math.exp(-dt/0.23);
    const desired=preview===null?goal:preview;
    if(tour&&!ctx.reduced()&&!held)bearing+=((Math.PI/2-0.1)*Math.sin(clock*0.22)-bearing)*ease;
    radius+=(desired-radius)*ease;cache+=(cacheGoal-cache)*ease;
    for(let i=0;i<3;i++)values[i]+=(targets[i]-values[i])*ease;
    for(const d of dials)d.value+=(d.target-d.value)*ease;
    let moving=Math.abs(radius-desired)>0.01||Math.abs(cache-cacheGoal)>0.01||values.some((v,i)=>Math.abs(v-targets[i])>0.001)||dials.some(d=>Math.abs(d.target-d.value)>0.001);
    if(!moving){radius=desired;cache=cacheGoal;values=[...targets];for(const d of dials)d.value=d.target;}
    draw();say();if(moving||(tour&&!ctx.reduced()&&!held))raf=requestAnimationFrame(tick);
  }
  function run(){if(!raf&&visible&&!destroyed){last=0;raf=requestAnimationFrame(tick);}}
  function schedule(delay){clearTimeout(timer);timer=setTimeout(()=>{if(!held&&!ctx.reduced()){tour=true;clock=phase*2;run();}},delay);}
  function pause(){tour=false;clearTimeout(timer);}
  function resume(){preview=null;schedule(3600);run();}
  function choose(next){phase=(next+4)%4;say();ctx.announce(ctx.t('phase.'+phase));}
  const roundedRadius=r=>Math.max(0.1,Math.min(5,Math.round(r*10)/10));
  function commit(r){ctx.set({radius:roundedRadius(r)});}
  function pointerRadius(e){const b=stage.getBoundingClientRect();return roundedRadius(0.1+4.9*(e.clientX-b.left)/b.width);}
  const meaningful=e=>e.target.closest('[data-item="coverage"],[data-item="radiusArm"],[data-item="slider"],[data-item="stylus"],[data-item^="pivot"]');
  function previewAt(e){
    const r=pointerRadius(e),span=Math.ceil(2*r/state.cell)+2;
    preview=166*r/(span*state.cell);
    run();
  }
  on('pointerenter',()=>{held=true;pause();});
  on('pointermove',e=>{
    if(!state)return;
    if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6)gesture.cancelled=true;
    pause();
    if(meaningful(e))previewAt(e);
    else if(preview!==null){preview=null;run();}
  });
  on('pointerdown',e=>{
    gesture=meaningful(e)?{x:e.clientX,y:e.clientY,cancelled:false}:null;
    if(!gesture||!state)return;
    pause();previewAt(e);stage.focus({preventScroll:true});
  });
  on('pointercancel',()=>{if(gesture)gesture.cancelled=true;preview=null;run();});
  on('click',e=>{
    if(!state||!meaningful(e)||!gesture||gesture.cancelled)return;
    const allowed=Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<6;
    gesture=null;
    if(!allowed)return;
    pause();preview=null;commit(pointerRadius(e));stage.focus({preventScroll:true});
  });
  on('pointerleave',()=>{held=stage.matches(':focus');if(!held)resume();else{preview=null;run();}});
  on('focus',()=>{held=true;pause();describe();});
  on('blur',()=>{held=stage.matches(':hover');if(!held)resume();});
  on('keydown',e=>{
    if(!state)return;let next=null;
    if(e.key==='ArrowRight'||e.key==='ArrowUp')next=state.radius+(e.shiftKey?1:0.1);
    if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=state.radius-(e.shiftKey?1:0.1);
    if(e.key==='Home')next=0.1;if(e.key==='End')next=5;
    if(next!==null){e.preventDefault();pause();preview=null;commit(next);return;}
    if(e.key===' '||e.key==='Enter'){e.preventDefault();pause();choose(phase+1);}
    if(e.key==='Escape'){e.preventDefault();preview=null;pause();run();}
  });
  const io=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'120px 0px'});io.observe(stage);
  function update(s,r){
    state=s;result=r;if(!s||!r)return;
    const span=Math.sqrt(r.metrics[0].value);goal=166*s.radius/(span*s.cell);cacheGoal=54*s.hit/100;
    targets=[r.metrics[1].value/Math.max(r.metrics[1].value,1),r.metrics[2].value/Math.max(r.metrics[1].value,1),r.metrics[3].value/Math.max(r.metrics[0].value*s.qps,1)];
    for(const d of dials)d.target=d.name==='precision'?s.cell/2:d.name==='density'?s.density/10000:s.qps/10000;
    if(span!==gridSpan){
      const side=166/span;
      gridPattern.setAttribute('width',String(side));
      gridPattern.setAttribute('height',String(side));
      gridCell.setAttribute('d',`M0 0H${side}V${side}H0Z`);
      gridSocket.setAttribute('cx',String(side/2));
      gridSocket.setAttribute('cy',String(side/2));
      gridSocket.setAttribute('r',String(Math.min(1.8,side*0.12)));
      gridSpan=span;
    }
    preview=null;describe();if(ctx.reduced()){radius=goal;cache=cacheGoal;values=[...targets];for(const d of dials)d.value=d.target;draw();}say();run();
  }
  schedule(1400);
  return {update,destroy(){destroyed=true;cancelAnimationFrame(raf);clearTimeout(timer);io.disconnect();listeners.forEach(([type,fn])=>stage.removeEventListener(type,fn));},relocalize(){lastReadout=null;say();describe();ctx.announce('');}};
}
