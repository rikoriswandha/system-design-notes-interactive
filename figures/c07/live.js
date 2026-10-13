export default function mount(root, ctx, K, DATA) {
  const { k } = K, { P, clock } = DATA;
  const stage=ctx.stage;
  const partitions=[...root.querySelectorAll('[data-divider]')];
  const press=[...root.querySelectorAll('[data-press]')];
  const plunger=root.querySelector('[data-plunger]');
  const counters=[...root.querySelectorAll('[data-counter]')];
  const rider=root.querySelector('[data-rider]');
  const cursor=root.querySelector('[data-cursor]'), hand=root.querySelector('[data-clock]');
  let state, result, selected=2, preview=null;
  let values=[41,10,12], targets=[41,10,12], age=0, stroke=0, travel=1, clockAngle=0;
  let raf=0, last=0, visible=true, hovering=false, focused=false, destroyed=false;
  let timer=0, phaseTimer=0, tour=false, phase='ready';
  let lastStroke=NaN, lastBudget='', lastRider='', lastClock=NaN, lastDescription='';
  const listeners=[];
  const on=(el,type,fn)=>{el.addEventListener(type,fn);listeners.push([el,type,fn]);};
  function say() {
    if(!result)return;
    const n=preview===null?selected:preview;
    const text=n===0?ctx.t('time',{bits:ctx.format(result.metrics[0].value),years:ctx.format(result.metrics[1].value)}):n===1?ctx.t('workers',{active:ctx.format(result.table.rows[2][1]),max:ctx.format(result.table.rows[1][1])}):ctx.t('wait',{slots:ctx.format(result.table.rows[0][1]),wait:ctx.format(result.metrics[3].value)});
    ctx.readout(text);
    counters.forEach((node,i)=>{node.textContent=ctx.format(targets[i]);});
  }
  function describe() {
    if(!result)return;
    const text=ctx.t('description',{bank:ctx.t(`bank.${selected}`),time:ctx.format(result.metrics[0].value),worker:ctx.format(state.workerBits),sequence:ctx.format(state.sequenceBits),capacity:ctx.format(result.metrics[2].value),wait:ctx.format(result.metrics[3].value)});
    if(text!==lastDescription){lastDescription=text;ctx.describe(text);}
  }
  function setPhase(next) {
    if(phase!==next){phase=next;root.dataset.phase=next;}
  }
  function schedule(delay) {
    clearTimeout(timer);clearTimeout(phaseTimer);phaseTimer=0;
    if(ctx.reduced()||hovering||focused||destroyed||!visible||(state&&state.workers>result.table.rows[1][1]))return;
    timer=setTimeout(()=>{tour=true;age=0;kick();},delay);
  }
  function take(){tour=false;age=0;clearTimeout(timer);schedule(3600);kick();}
  function kick(){if(!raf&&visible&&!destroyed&&state){last=0;raf=requestAnimationFrame(tick);}}
  const follow=(current,target,dt)=>ctx.reduced()||Math.abs(target-current)<.0001?target:current+(target-current)*(1-Math.exp(-dt/.18));
  function tick(now) {
    raf=0;if(destroyed||!visible||!state)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    if(ctx.reduced())tour=false;
    if(tour)age+=dt;
    const slots=result.table.rows[0][1];
    const overflow=result.metrics[3].value-state.rollback;
    const rollbackDuration=state.rollback?Math.log2(state.rollback+1)*.2:0;
    const burstDuration=overflow?Math.log2(overflow+1)*.32:0;
    const consumeDuration=2, stampDuration=1.3;
    const cycle=rollbackDuration+consumeDuration+burstDuration+stampDuration;
    const t=tour?age%cycle:0;
    let fraction=Math.min(1,state.burst/slots), down=0;
    const invalid=state.workers>result.table.rows[1][1];
    if(invalid){tour=false;fraction=0;}
    if(tour) {
      if(t<rollbackDuration){setPhase('rollback');fraction=0;}
      else if(t<rollbackDuration+consumeDuration){setPhase('sequence');fraction=Math.min(1,state.burst/slots)*(t-rollbackDuration)/consumeDuration;}
      else if(t<rollbackDuration+consumeDuration+burstDuration){setPhase('overflow');fraction=1;}
      else {setPhase('stamp');fraction=((state.burst-1)%slots+1)/slots;down=1.5;}
    } else setPhase(invalid?'invalid':'ready');
    let moving=false;
    for(let i=0;i<3;i++){values[i]=follow(values[i],targets[i],dt);moving ||= values[i]!==targets[i];}
    stroke=follow(stroke,down,dt);travel=follow(travel,fraction,dt);
    moving ||= stroke!==down||travel!==fraction;
    const budget=values.join(',');
    if(budget!==lastBudget){
      lastBudget=budget;
      const edges=[-96,-94.5+values[0]*3-1.5,-94.5+(values[0]+values[1])*3-1.5,93];
      const rest=[-96,27,57,93];
      partitions.forEach(el=>{const i=Number(el.dataset.divider);el.setAttribute('transform',k.translateAlong(P,[edges[i]-rest[i],0,0]));});
    }
    const riderKey=`${budget}/${travel}`;
    if(riderKey!==lastRider){
      lastRider=riderKey;
      const sx=-94.5+(values[0]+values[1])*3+values[2]*3*travel;
      rider.setAttribute('transform',k.translateAlong(P,[sx-59.5,0,0]));
      cursor.setAttribute('d',k.segment([sx,27,20],[sx,32,20],P));
      root.dataset.sequenceFraction=travel.toFixed(4);
    }
    if(stroke!==lastStroke){
      lastStroke=stroke;
      const offset=k.translateAlong(P,[0,0,-stroke]);
      press.forEach(el=>el.setAttribute('transform',offset));
      const zero=k.iso([0,0,0],P), slid=k.iso([0,0,-stroke],P);
      k.holdStill(plunger,[slid[0]-zero[0],slid[1]-zero[1]]);
    }
    if(tour&&phase!=='rollback')clockAngle+=dt*.9;
    if(clockAngle!==lastClock){
      lastClock=clockAngle;
      hand.setAttribute('d',k.lineOnTop([clock.x,clock.y],[clock.x+Math.sin(clockAngle)*12,clock.y-Math.cos(clockAngle)*12],12.2,P));
    }
    if(tour&&phase==='rollback'&&!moving){
      const remaining=rollbackDuration-t;
      phaseTimer=setTimeout(()=>{
        phaseTimer=0;
        if(!tour||!visible||destroyed)return;
        age+=remaining;kick();
      },remaining*1000);
    } else if(tour||moving){raf=requestAnimationFrame(tick);}
  }
  function select(n){
    const changed=n!==selected;
    selected=n;preview=null;take();say();
    if(changed)describe();
  }
  function where(e){
    const matrix=ctx.svg.getScreenCTM();
    if(!matrix)return null;
    const pointer=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    const a=k.iso([-94.5,6,44-stroke],P), b=k.iso([94.5,6,44-stroke],P);
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const ux=dx/length,uy=dy/length;
    const along=(pointer.x-a[0])*ux+(pointer.y-a[1])*uy;
    const across=(pointer.x-a[0])*(-uy)+(pointer.y-a[1])*ux;
    const y=k.axisVector(P,[0,1,0]),z=k.axisVector(P,[0,0,1]);
    const determinant=y[0]*z[1]-y[1]*z[0];
    const capX=pointer.x-b[0],capY=pointer.y-b[1];
    const capRadialY=(capX*z[1]-capY*z[0])/determinant;
    const capRadialZ=(y[0]*capY-y[1]*capX)/determinant;
    if(capRadialY*capRadialY+capRadialZ*capRadialZ<=144)return 2;
    const normalY=y[0]*(-uy)+y[1]*ux,normalZ=z[0]*(-uy)+z[1]*ux;
    const radialScale=Math.hypot(normalY,normalZ);
    if(Math.abs(across)>12*radialScale+4)return null;
    const hy=normalY/radialScale,hz=normalZ/radialScale;
    const radial=Math.max(-12,Math.min(12,across/radialScale));
    const view=K.G.viewOf(P);
    const front=Math.sign(-hz*view[1]+hy*view[2])*Math.sqrt(144-radial*radial);
    const radialY=hy*radial-hz*front,radialZ=hz*radial+hy*front;
    // Remove the visible cylinder surface's axial skew before locating a bit.
    const skew=(y[0]*radialY+z[0]*radialZ)*ux+(y[1]*radialY+z[1]*radialZ)*uy;
    const axisPosition=along-skew;
    if(axisPosition<0||axisPosition>length)return null;
    const x=-94.5+axisPosition/length*189;
    return x<-94.5+values[0]*3?0:x<-94.5+(values[0]+values[1])*3?1:2;
  }
  on(stage,'pointerenter',()=>{hovering=true;take();});
  on(stage,'pointermove',e=>{const n=where(e);if(n!==preview){preview=n;say();}});
  on(stage,'pointerleave',()=>{hovering=false;preview=null;take();say();});
  on(stage,'click',e=>{const n=where(e);if(n!==null)select(n);});
  on(stage,'focus',()=>{focused=true;take();});
  on(stage,'blur',()=>{focused=false;take();});
  on(stage,'keydown',e=>{
    if(!state)return;
    if(['ArrowLeft','ArrowRight','Home','End','ArrowUp','ArrowDown',' ','Enter','Escape'].includes(e.key))e.preventDefault();else return;
    preview=null;
    if(e.key==='ArrowLeft')select(Math.max(0,selected-1));
    else if(e.key==='ArrowRight')select(Math.min(2,selected+1));
    else if(e.key==='Home')select(0);
    else if(e.key==='End')select(2);
    else if(e.key==='ArrowUp'||e.key==='ArrowDown'){
      take();const key=selected===1?'workerBits':'sequenceBits';
      const direction=(e.key==='ArrowUp'?1:-1)*(selected===0?-1:1);
      ctx.set({[key]:Math.max(key==='workerBits'?2:4,Math.min(16,state[key]+direction))});
    } else if(e.key==='Escape'){take();ctx.announce(ctx.t('phase.ready'));}
    else {
      tour=!tour&&!ctx.reduced();age=0;clearTimeout(timer);clearTimeout(phaseTimer);phaseTimer=0;
      const next=!tour?'ready':state.workers>result.table.rows[1][1]?'invalid':state.rollback?'rollback':'sequence';
      ctx.announce(ctx.t(`phase.${next}`));kick();
    }
  });
  const observer=new IntersectionObserver(entries=>{
    visible=entries[entries.length-1].isIntersecting;
    if(visible){last=0;kick();schedule(1400);}else{cancelAnimationFrame(raf);raf=0;clearTimeout(timer);clearTimeout(phaseTimer);phaseTimer=0;}
  },{rootMargin:'120px 0px'});observer.observe(stage);
  function update(s,r){state=s;result=r;if(!s||!r)return;targets=[r.metrics[0].value,s.workerBits,s.sequenceBits];say();describe();kick();schedule(1400);}
  return {update,relocalize(){say();describe();ctx.announce('');},destroy(){destroyed=true;cancelAnimationFrame(raf);clearTimeout(timer);clearTimeout(phaseTimer);observer.disconnect();listeners.forEach(([el,type,fn])=>el.removeEventListener(type,fn));}};
}
