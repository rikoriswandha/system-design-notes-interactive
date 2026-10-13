export default function mount(root, ctx, K, DATA) {
  const {k,G}=K, {P,ticketCenter,ticketRing,ticketBorder,fillPlan,failureDial}=DATA;
  const stage=ctx.stage, parts=root.querySelector('[data-machine-parts]');
  const ticket=root.querySelector('[data-ticket]'), gate=root.querySelector('[data-gate]'), lift=root.querySelector('[data-lift]'), level=root.querySelector('[data-level]');
  const counter=root.querySelector('[data-attempt-display]'), needle=root.querySelector('[data-failure-needle]');
  const ticketRefs={fill:ticket.querySelector('.iso-fill'),top:ticket.querySelector('.iso-top'),edge:ticket.querySelector('.iso-edge'),crease:ticket.querySelector('.iso-crease'),border:ticket.querySelector('[data-ticket-border]'),fold:ticket.querySelector('[data-ticket-fold]'),shades:[0,1,2,3].map(i=>ticket.querySelector(`[data-shade="${i}"]`))};
  const fill=root.querySelector('[data-fill]');
  const fillRefs={fill:fill.querySelector('.iso-fill'),top:fill.querySelector('.iso-top'),edge:fill.querySelector('.iso-edge'),crease:fill.querySelector('.iso-crease'),bevel:fill.querySelector('.iso-bevel'),border:fill.querySelector('[data-fill-border]'),seams:[...fill.querySelectorAll('[data-fill-seam]')],shades:[...fill.querySelectorAll('.iso-shade')]};
  const items=DATA.scene.map(i=>({...i,node:parts.querySelector(`[data-machine-item="${i.index}"]`),current:i.key}));
  let order=items.map(i=>i.index).join(','), state=null,result=null, selected=0,preview=null;
  let frame=0,last=0,clock=0,visible=false,touring=false,hover=false,focused=false,timer=0;
  let amount=0,opening=0,height=0,failure=0,targetAmount=0,targetOpening=0,targetFailure=0;
  let ticketAt=[...ticketCenter], ticketAngle=0, painted='';
  let paintedFill=-1;
  let trace='main',progress=0,attempt=0,from=[...ticketCenter],target=[...ticketCenter];
  let newTicket=false;
  let gesture=null,described='';
  const attr=(node,name,value)=>{const text=String(value);if(node.getAttribute(name)!==text)node.setAttribute(name,text);};
  const durations={main:3.4,exit:0.9,turn:0.9,transfer:1.8,lift:2.2,upper:2.4,chute:1.5,drop:0.8,feed:0.8,settle:0.3,finish:0.7};
  const ends={main:[100,5,24.8],exit:[120,5,27],turn:[120,-35.5,29],transfer:[13.5,-35.5,29],lift:[13.5,-35.5,85],upper:[-108,-35.5,85],chute:[-108,5,57],drop:[-108,5,28],feed:[-69.5,5,28],settle:ticketCenter,finish:[120,5,27]};
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const follow=(a,b,dt)=>Math.abs(a-b)<0.002?b:a+(b-a)*(1-Math.exp(-dt/0.12));
  const smooth=n=>{const x=clamp(n,0,1);return x*x*(3-2*x);};
  function chuteSupport(y,angle) {
    const c=Math.cos(angle),s=Math.sin(angle),floor=y=>y<=-28?85:y>=-6?57:85-(y+28)*28/22;
    const contacts=[-5,5,(-28-y)/c,(-6-y)/c].filter(v=>v>=-5&&v<=5);
    return Math.max(...contacts.map(v=>floor(y+c*v)+s*v));
  }
  function say() {
    if(!result)return;
    ctx.readout(ctx.t(['read.attempts','read.capacity','read.success','read.backlog'][selected],{value:ctx.format(result.metrics[selected].value,{maximumFractionDigits:2})}));
    const text=ctx.format(result.table.rows[1][1],{maximumFractionDigits:0});if(counter.textContent!==text)counter.textContent=text;
  }
  function describe() {
    if(!state)return;
    const signature=`${ctx.locale}|${state.failure}|${state.attempts}`;
    if(signature===described)return;
    described=signature;attr(stage,'aria-valuenow',state.failure);
    ctx.describe(ctx.t('describe',{failure:ctx.format(state.failure),attempts:ctx.format(state.attempts)}));
  }
  function nextTrace() {
    let next;
    if(trace==='main')next=state.failure>0&&attempt+1<state.attempts?'exit':'finish';
    else if(trace==='finish'){next='main';attempt=0;}
    else if(trace==='settle'){next='main';attempt=Math.min(attempt+1,state.attempts-1);}
    else next={exit:'turn',turn:'transfer',transfer:'lift',lift:'upper',upper:'chute',chute:'drop',drop:'feed',feed:'settle'}[trace];
    if(trace==='finish'){from=[...ticketCenter];target=[...ticketCenter];ticketAt=[...ticketCenter];ticketAngle=0;newTicket=true;}else from=[...target];
    trace=next;progress=0;root.dataset.route=trace;
  }
  function traceTarget() {
    const end=ends[trace];
    target=from.map((v,i)=>v+(end[i]-v)*smooth(progress));
    if(trace==='exit'||trace==='finish')target[2]=24.8+2.2*smooth(progress/0.32);
    let angle=0;
    if(trace==='chute') {
      const y=target[1], steep=Math.atan(28/22);
      angle=steep*smooth((y+35.5)/12.5)*(1-smooth((y+6)/11));
      target[2]=chuteSupport(y,angle);
    }
    return angle;
  }
  function cardPaths(point,angle) {
    const c=Math.cos(angle),s=Math.sin(angle);
    const F=G.frameOf(point,[0,s,c],[1,0,0],[0,c,-s]);
    const paths=G.prismOf(F,ticketRing,0,1.3,P);
    attr(ticketRefs.fill,'d',paths.fill);attr(ticketRefs.top,'d',paths.top);attr(ticketRefs.edge,'d',paths.outline);
    if(ticketRefs.crease)attr(ticketRefs.crease,'d',paths.crease||'');
    ticketRefs.shades.forEach((node,i)=>attr(node,'d',paths.shades[i]||''));
    const at=([x,y])=>k.iso([point[0]+x,point[1]+c*y+s*1.3,point[2]-s*y+c*1.3],P);
    const path=(points,close=false)=>points.map((p,i)=>`${i?'L':'M'}${at(p).join(' ')}`).join('')+(close?'Z':'');
    attr(ticketRefs.border,'d',path(ticketBorder,true));
    attr(ticketRefs.fold,'d',path([[-6,-3.5],[0,0],[6,-3.5]]));
  }
  function fillPaths() {
    const h=amount*34;
    if(Math.abs(h-paintedFill)<0.001)return;
    paintedFill=h;const opacity=h<0.01?'0':'1';if(fill.style.opacity!==opacity)fill.style.opacity=opacity;
    const paths=k.slabOf(fillPlan,4,Math.max(0.001,h),P,5,Math.min(0.5,h/3));
    attr(fillRefs.fill,'d',paths.fill);attr(fillRefs.top,'d',paths.top);attr(fillRefs.edge,'d',paths.outline);
    if(fillRefs.crease)attr(fillRefs.crease,'d',paths.crease||'');
    if(fillRefs.bevel)attr(fillRefs.bevel,'d',paths.bevel||'');
    for(const node of fillRefs.shades)attr(node,'d',paths.shades[Number(node.dataset.shade)]||'');
    for(const node of fillRefs.seams)attr(node,'d',k.sideSeam(fillPlan,4+h*Number(node.dataset.fillSeam),P,5));
    attr(fillRefs.border,'d',k.planOutline(k.insetPlan(fillPlan,1.5),4+h,P,5));
  }
  function reorder(delta) {
    let pose=null;
    if(['chute','drop','feed','settle'].includes(trace)) {
      let distance=Infinity;
      for(const candidate of DATA.depthPoses) {
        const d=candidate.point.reduce((sum,v,i)=>sum+(v-ticketAt[i])**2,0)+400*(candidate.angle-ticketAngle)**2;
        if(d<distance){distance=d;pose=candidate;}
      }
    }
    for(const item of items) {
      let shift=0;
      if(item.name==='ticket')shift=k.depthOf(pose?ticketAt.map((v,i)=>v-pose.point[i]):delta,P);
      if(item.name==='lift-carriage')shift=k.depthOf([0,0,height],P);
      if(item.name==='gate')shift=k.depthOf([0,0,opening*12],P);
      item.current=(pose?pose.keys[item.index]:item.key)+shift;
    }
    const sorted=[...items].sort((a,b)=>a.current-b.current),next=sorted.map(i=>i.index).join(',');
    if(next!==order){const fragment=document.createDocumentFragment();for(const item of sorted)fragment.appendChild(item.node);parts.appendChild(fragment);order=next;}
  }
  function draw() {
    fillPaths();
    attr(gate,'transform',k.translateAlong(P,[0,0,opening*12]));
    attr(level,'transform',k.translateAlong(P,[0,0,amount*34]));
    attr(lift,'transform',k.translateAlong(P,[0,0,height]));
    const angle=failure*Math.PI*1.65-Math.PI*0.82;
    attr(needle,'d',k.lineOnTop([failureDial.x,failureDial.y],[failureDial.x+7.5*Math.sin(angle),failureDial.y-7.5*Math.cos(angle)],failureDial.z,P));
    const signature=ticketAt.map(n=>n.toFixed(3)).join(',')+','+ticketAngle.toFixed(3);
    if(signature!==painted){cardPaths(ticketAt,ticketAngle);painted=signature;}
    const opacity=ctx.reduced()?'1':trace==='finish'?String(1-smooth((progress-0.5)/0.5)):newTicket?String(smooth(progress/0.08)):'1';
    if(ticket.style.opacity!==opacity)ticket.style.opacity=opacity;
    reorder(ticketAt.map((v,i)=>v-ticketCenter[i]));
    const text=preview===null?'':String(preview);if(root.dataset.preview!==text)root.dataset.preview=text;
  }
  function tick(now) {
    frame=0;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced();
    let wantAngle=ticketAngle, wantHeight=height;
    if(touring&&!calm&&state&&result) {
      clock+=dt;
      // This is a representative bounded retry path, not random outcomes or
      // real-time backoff. The attempt-capacity model controls its pace.
      progress=Math.min(1,progress+dt*(0.65+Math.min(1,result.table.rows[1][1]/600))/durations[trace]);
      if(trace==='main'&&progress>=0.08)newTicket=false;
      wantAngle=traceTarget();
      wantHeight=trace==='lift'?(target[2]-29):0;
      if(trace==='lift')target[2]=29+height;
      const next=Math.floor(clock/3)%4;if(next!==selected){selected=next;say();}
      if(progress>=1&&ticketAt.every((v,i)=>Math.abs(v-target[i])<0.02)&&Math.abs(ticketAngle-wantAngle)<0.002&&(trace!=='lift'||Math.abs(height-56)<0.02))nextTrace();
    }
    amount=calm?targetAmount:follow(amount,targetAmount,dt);
    opening=calm?targetOpening:follow(opening,targetOpening,dt);
    failure=calm?targetFailure:follow(failure,targetFailure,dt);
    height=calm?0:follow(height,wantHeight,dt);
    ticketAngle=calm?0:follow(ticketAngle,wantAngle,dt);
    ticketAt=calm?[...ticketCenter]:ticketAt.map((v,i)=>follow(v,target[i],dt));
    if(trace==='lift'&&!calm)ticketAt[2]=29+height;
    if(trace==='chute'&&!calm)ticketAt[2]=Math.max(ticketAt[2],chuteSupport(ticketAt[1],ticketAngle));
    draw();
    const moving=amount!==targetAmount||opening!==targetOpening||failure!==targetFailure||height!==wantHeight||ticketAt.some((v,i)=>Math.abs(v-target[i])>0.002)||Math.abs(ticketAngle-wantAngle)>0.002;
    if(visible&&!calm&&(touring||moving))frame=requestAnimationFrame(tick);
  }
  function run(){if(visible&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function resume(delay=3600){clearTimeout(timer);timer=setTimeout(()=>{if(!hover&&!focused&&!ctx.reduced()){touring=true;run();}},delay);}
  function pause(){
    touring=false;clearTimeout(timer);
    if(trace==='drop'){ticketAt=[...ends.drop];target=[...ends.drop];ticketAngle=0;nextTrace();draw();}
    target=[...ticketAt];run();
  }
  function choose(n,announce=false){if(n!==selected){selected=n;say();if(announce)ctx.announce(ctx.t(`phase.${n}`));}}
  const meaningful=e=>e.target instanceof Element&&e.target.closest('[data-failure-control]');
  function probabilityAt(e) {
    const box=ctx.svg.getBoundingClientRect(),origin=k.iso([failureDial.x,failureDial.y,failureDial.z],P);
    const dx=(e.clientX-box.left)*600/box.width-origin[0],dy=(e.clientY-box.top)*380/box.height-origin[1];
    const x=k.axisVector(P,[1,0,0]),y=k.axisVector(P,[0,1,0]),det=x[0]*y[1]-x[1]*y[0];
    const wx=(dx*y[1]-dy*y[0])/det,wy=(x[0]*dy-x[1]*dx)/det;
    return Math.round(clamp((Math.atan2(wx,-wy)+Math.PI*0.82)/(Math.PI*1.65),0,1)*90);
  }
  function pointer(e){
    pause();if(gesture&&gesture.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6)gesture.moved=true;
    const rect=stage.getBoundingClientRect(),share=clamp((e.clientX-rect.left)/rect.width,0,1);
    preview=meaningful(e)?probabilityAt(e):null;choose(Math.min(3,Math.floor(share*4)));
  }
  function press(e){if(!meaningful(e)||e.button!==0)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};stage.focus();pointer(e);}
  function cancel(){gesture=null;}
  function release(e){
    const down=gesture;gesture=null;
    if(!down||down.id!==e.pointerId||down.moved||Math.hypot(e.clientX-down.x,e.clientY-down.y)>=6||!meaningful(e))return;
    if(state)ctx.set({failure:probabilityAt(e)});describe();
  }
  function enter(){hover=true;pause();}
  function leave(){gesture=null;hover=false;preview=null;resume();}
  function focus(){focused=true;pause();describe();}
  function blur(){focused=false;preview=null;resume();}
  function key(e){
    if(!state)return;let next=null;
    if(e.key==='ArrowRight'||e.key==='ArrowUp')next=state.failure+(e.shiftKey?10:1);
    if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=state.failure-(e.shiftKey?10:1);
    if(e.key==='Home')next=0;if(e.key==='End')next=90;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();pause();choose((selected+1)%4,true);return;}
    if(e.key==='Escape'){preview=null;return;}
    if(next===null)return;e.preventDefault();pause();ctx.set({failure:clamp(next,0,90)});describe();
  }
  const listeners=[['pointerenter',enter],['pointermove',pointer],['pointerdown',press],['pointerup',release],['pointercancel',cancel],['pointerleave',leave],['focus',focus],['blur',blur],['keydown',key]];
  for(const [event,handler] of listeners)stage.addEventListener(event,handler);
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;last=0;}},{rootMargin:'120px 0px'});observer.observe(stage);resume(1400);
  return {
    update(s,r){state=s;result=r;if(!s||!r)return;targetAmount=clamp(r.metrics[3].value/(s.arrival*s.minutes*60),0,1);targetOpening=clamp(s.quota/(s.workers*s.speed),0,1);targetFailure=s.failure/90;say();describe();if(ctx.reduced()){amount=targetAmount;opening=targetOpening;failure=targetFailure;height=0;ticketAt=[...ticketCenter];ticketAngle=0;draw();}run();},
    relocalize(){say();describe();ctx.announce('');},
    destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();for(const [event,handler] of listeners)stage.removeEventListener(event,handler);}
  };
}
