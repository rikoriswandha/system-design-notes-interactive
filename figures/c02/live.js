export default function mount(root,ctx,K,DATA){
  const {k,G}=K;
  const {P,controls}=DATA;
  const handles=controls.map(([name])=>Array.from(root.querySelectorAll(`[data-lever="${name}"]`)));
  const pinwheels=controls.map(([name])=>root.querySelector(`[data-pinwheel="${name}"]`));
  const drums=DATA.digitFrames.map((bank,i)=>bank.map((_,j)=>root.querySelector(`[data-digit="${i}.${j}"]`)));
  const carriage=Array.from(root.querySelectorAll('[data-carriage]'));
  const orderedLayer=root.querySelector('[data-order-layer]');
  const orderedItems=Array.from(root.querySelectorAll('[data-order-item]')).map((node,index)=>({node,index,key:Number(node.dataset.key),lift:Number(node.dataset.lift)}));
  let order=orderedItems.map(item=>item.index).join(',');
  const turns=root.querySelector('[data-turns]');
  const grip=root.querySelector('[data-crank-grip]');
  const arm=root.querySelector('[data-crank-arm] .iso-solid');
  const svgNS='http://www.w3.org/2000/svg';
  // The kit omits empty shade sheets at build time. Reserve all four once,
  // since rotating the crank changes which of those sheets are nonempty.
  const shades=Array.from({length:4},(_,i)=>{
    let node=arm.querySelector(`[data-shade="${i}"]`);
    if(!node){node=document.createElementNS(svgNS,'path');node.setAttribute('class','iso-shade');node.setAttribute('data-shade',i);arm.insertBefore(node,arm.querySelector('.iso-top'));}
    return node;
  });
  const solidRefs={fill:arm.querySelector('.iso-fill'),top:arm.querySelector('.iso-top'),outline:arm.querySelector('.iso-edge'),crease:arm.querySelector('.iso-crease'),bevel:arm.querySelector('.iso-bevel')};
  const shapeFrame={o:DATA.crank.o,a:DATA.crank.a,u:[0,1,0],v:[0,0,1]};
  let state=null,result=null,selected=0,metric=0,frame=0,last=0,visible=true,hover=false,focused=false,dead=false,timer=0;
  let nextTour=performance.now()+1400,angle=0,targetAngle=0,slide=0;
  const position=controls.map(()=>0),targets=controls.map(()=>0),lastPosition=controls.map(()=>NaN);
  const rolling=[0,0,0,0],lastRolling=[NaN,NaN,NaN,NaN],previousValues=[null,null,null,null],previousText=[null,null,null,null];
  let lastAngle=NaN,lastSlide=NaN;
  const tracks=DATA.leverXs.map(x=>[k.iso([x,-38.5,DATA.leverOriginZ],P),k.iso([x,16.5,DATA.leverOriginZ],P)]);
  const fmt=(value,decimals=2)=>ctx.format(value,{maximumFractionDigits:decimals});
  function drumText(value,places){
    let decimals=2,text=fmt(value,decimals);
    while(text.length>places&&decimals>0)text=fmt(value,--decimals);
    return text.padStart(places,' ');
  }
  function describeSetting(){
    if(!state)return;
    const [name]=controls[selected];
    ctx.describe(ctx.t('setting',{name:ctx.t(`control.${name}`),value:fmt(state[name])}));
  }
  function words(){
    if(!state||!result)return;
    for(let i=0;i<4;i++){
      const value=result.metrics[i].value;
      const text=drumText(value,drums[i].length);
      if(text!==previousText[i]){
        drums[i].forEach((node,j)=>{node.textContent=text[j]||' ';});
        previousText[i]=text;
      }
    }
    const turnText=fmt(state.peak);
    if(turns.textContent!==turnText)turns.textContent=turnText;
    ctx.readout(ctx.t(`read.${metric}`,{value:fmt(result.metrics[metric].value)}));
  }
  function draw(){
    for(let i=0;i<position.length;i++){
      if(position[i]!==lastPosition[i]){
        const transform=k.translateAlong(P,[0,position[i]*55,0]);
        handles[i].forEach(node=>node.setAttribute('transform',transform));
        pinwheels[i].setAttribute('d',G.spokesOf(DATA.wheelFrames[i],10,3,13,12,P,{phase:position[i]*Math.PI*2}));
        lastPosition[i]=position[i];
      }
    }
    for(let i=0;i<4;i++)if(rolling[i]!==lastRolling[i]){
      drums[i].forEach(node=>node.setAttribute('y',rolling[i]));
      lastRolling[i]=rolling[i];
    }
    if(slide!==lastSlide){
      const transform=k.translateAlong(P,[slide,0,0]);
      carriage.forEach(node=>node.setAttribute('transform',transform));
      orderedItems.sort((a,b)=>(a.key+a.lift*slide/DATA.carriageMove[0])-(b.key+b.lift*slide/DATA.carriageMove[0])||a.index-b.index);
      const nextOrder=orderedItems.map(item=>item.index).join(',');
      if(nextOrder!==order){
        const fragment=document.createDocumentFragment();
        orderedItems.forEach(item=>fragment.appendChild(item.node));
        orderedLayer.appendChild(fragment);order=nextOrder;
      }
      lastSlide=slide;
    }
    if(angle!==lastAngle){
      const c=Math.cos(angle),s=Math.sin(angle);
      shapeFrame.u[1]=c;shapeFrame.u[2]=s;
      shapeFrame.v[1]=-s;shapeFrame.v[2]=c;
      const paths=G.prismOf(shapeFrame,DATA.crankPolygon,28,31,P);
      Object.entries(solidRefs).forEach(([name,node])=>{if(node)node.setAttribute('d',paths[name]||'');});
      shades.forEach((node,i)=>node.setAttribute('d',paths.shades[i]||''));
      grip.setAttribute('transform',k.translateAlong(P,[0,24*(c-1),24*s]));
      lastAngle=angle;
    }
  }
  const follow=(at,target,dt,seconds,epsilon=.0001)=>Math.abs(target-at)<epsilon?target:at+(target-at)*(1-Math.exp(-dt/seconds));
  function tick(now){
    frame=0;if(dead||!visible)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const reduced=ctx.reduced(),tour=!reduced&&!hover&&!focused;
    if(tour&&now>=nextTour){metric=(metric+1)%4;nextTour=now+2700;words();}
    let moving=false;
    for(let i=0;i<position.length;i++){
      position[i]=reduced?targets[i]:follow(position[i],targets[i],dt,.24);
      moving ||= position[i]!==targets[i];
    }
    for(let i=0;i<4;i++){
      rolling[i]=reduced?0:follow(rolling[i],0,dt,.32);
      moving ||= rolling[i]!==0;
    }
    const carriageTarget=metric*DATA.carriageMove[0]/3;
    slide=reduced?carriageTarget:follow(slide,carriageTarget,dt,.3,.005);
    moving ||= slide!==carriageTarget;
    angle=reduced?targetAngle:follow(angle,targetAngle,dt,.35);
    moving ||= angle!==targetAngle;
    draw();
    if(moving)frame=requestAnimationFrame(tick);else schedule();
  }
  function schedule(){clearTimeout(timer);if(!dead&&visible&&!ctx.reduced()&&!hover&&!focused)timer=setTimeout(run,Math.max(0,nextTour-performance.now()));}
  function run(){if(!dead&&visible&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function hold(){nextTour=performance.now()+3600;clearTimeout(timer);run();}
  function select(index){
    if(index===selected)return;
    handles[selected].forEach(node=>node.removeAttribute('data-chosen'));
    selected=index;
    handles[selected].forEach(node=>node.setAttribute('data-chosen',''));
    words();
    describeSetting();
  }
  function pick(e){
    const box=ctx.svg.getBoundingClientRect();
    const point=[(e.clientX-box.left)*600/box.width,(e.clientY-box.top)*380/box.height];
    const tip=G.pointOf(shapeFrame,40.5,24,0),tipScreen=k.iso(tip,P);
    const onCrank=Math.hypot(point[0]-tipScreen[0],point[1]-tipScreen[1])<25;
    let distance=Infinity,index=selected,fraction=0;
    tracks.forEach(([a,b],i)=>{
      const vx=b[0]-a[0],vy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((point[0]-a[0])*vx+(point[1]-a[1])*vy)/(vx*vx+vy*vy)));
      const d=Math.hypot(point[0]-a[0]-vx*t,point[1]-a[1]-vy*t);
      if(d<distance){distance=d;index=i;fraction=t;}
    });
    return onCrank?{index:5,fraction,onCrank}:distance<=12?{index,fraction,onCrank:false}:null;
  }
  function commit(value){const [name,min,max,step]=controls[selected];const clamped=Math.max(min,Math.min(max,Math.round((value-min)/step)*step+min));ctx.set({[name]:Number(clamped.toFixed(1))});}
  function move(e){hover=true;hold();const choice=pick(e);if(choice)select(choice.index);}
  function click(e){
    if(!state)return;
    const choice=pick(e);if(!choice)return;
    hold();select(choice.index);
    const [name,min,max]=controls[selected];
    if(choice.onCrank){metric=1;commit(state.peak===max?min:state.peak+1);}
    else commit(min+(max-min)*choice.fraction);
  }
  function leave(){hover=false;hold();schedule();}
  function focus(){focused=true;hold();describeSetting();}
  function blur(){focused=false;hold();schedule();}
  function key(e){
    if(!state||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',' ','Enter','Escape'].includes(e.key))return;
    e.preventDefault();hold();const [name,min,max,step]=controls[selected];
    if(e.key==='ArrowLeft')select((selected+6)%7);
    else if(e.key==='ArrowRight')select((selected+1)%7);
    else if(e.key==='ArrowUp'||e.key==='ArrowDown')commit(state[name]+(e.key==='ArrowUp'?1:-1)*step*(e.shiftKey?10:1));
    else if(e.key==='Home')commit(min);
    else if(e.key==='End')commit(max);
    else if(e.key===' '||e.key==='Enter'){metric=(metric+1)%4;words();ctx.announce(ctx.t(`read.${metric}`,{value:fmt(result.metrics[metric].value)}));}
    else{select(0);metric=0;words();}
  }
  const events=[['pointermove',move],['click',click],['pointerleave',leave],['focus',focus],['blur',blur],['keydown',key]];
  events.forEach(([type,handler])=>ctx.stage.addEventListener(type,handler));
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){run();schedule();}else{cancelAnimationFrame(frame);frame=0;clearTimeout(timer);}},{rootMargin:'120px 0px'});
  observer.observe(ctx.stage);
  return {
    update(next,nextResult){
      const previousState=state;
      state=next;result=nextResult;if(!state||!result)return;
      controls.forEach(([name,min,max],i)=>targets[i]=(state[name]-min)/(max-min));
      for(let i=0;i<4;i++){
        const value=result.metrics[i].value;
        if(previousValues[i]!==null&&value!==previousValues[i])rolling[i]=ctx.reduced()?0:4;
        previousValues[i]=value;
      }
      targetAngle=(state.peak-1)*Math.PI*2;
      words();
      if(!previousState||previousState[controls[selected][0]]!==state[controls[selected][0]])describeSetting();
      if(previousState)hold();
      if(ctx.reduced()){position.splice(0,7,...targets);angle=targetAngle;slide=metric*DATA.carriageMove[0]/3;draw();}else run();
    },
    relocalize(){words();describeSetting();ctx.announce('');},
    destroy(){dead=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();events.forEach(([type,handler])=>ctx.stage.removeEventListener(type,handler));}
  };
}
