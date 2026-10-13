export default function mount(root, ctx, K, DATA) {
  const { k } = K;
  const stage=ctx.stage, feeler=root.querySelector('[data-feeler]');
  const cards=[...root.querySelectorAll('[data-card]')];
  const needle=root.querySelector('.snapshot-needle');
  const buttons=[...root.querySelectorAll('[data-mode]')];
  const listeners=[];
  const paintLayer=root.querySelector('[data-paint-layer]');
  const paint=DATA.paint.map((item,index)=>({...item,node:root.querySelector(`[data-paint="${index}"]`)}));
  const paintOrder=paint.map((_,index)=>index), previousOrder=paintOrder.slice();
  let state=ctx.state,result=ctx.result, metric=0,frame=0,last=0,clock=0,visible=false;
  let position=0,target=0,angle=0,targetAngle=0,touring=false,hover=false,focus=false,timer=0,dead=false;
  let drawnPosition=NaN,drawnAngle=NaN,description='';
  const listen=(node,type,fn)=>{node.addEventListener(type,fn);listeners.push(()=>node.removeEventListener(type,fn));};
  const fmt=value=>ctx.format(value,{notation:'compact',maximumFractionDigits:1});
  function text() {
    if(!state||!result)return;
    const values=result.metrics.map(m=>m.value);
    const key=['read.work','read.memory','read.age','read.build'][metric];
    const params={value:fmt(values[metric]),count:ctx.format(state.mode==='cached'?state.k:state.candidates)};
    ctx.readout(ctx.t(key,params));
    const nextDescription=ctx.t('description',{mode:ctx.t(`btn.${state.mode}`),count:params.count,work:fmt(values[0]),memory:fmt(values[1]),age:ctx.format(values[2]),build:fmt(values[3])});
    if(nextDescription!==description){ctx.describe(nextDescription);description=nextDescription;}
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode)));
  }
  function draw() {
    if(position!==drawnPosition){
      feeler.setAttribute('transform',k.translateAlong(DATA.P,[0,position,0]));
      const share=position/DATA.scanTravel;
      paintOrder.sort((a,b)=>(paint[a].key+paint[a].lift*share)-(paint[b].key+paint[b].lift*share));
      if(paintOrder.some((index,i)=>index!==previousOrder[i])){
        const fragment=document.createDocumentFragment();
        paintOrder.forEach((index,i)=>{fragment.appendChild(paint[index].node);previousOrder[i]=index;});
        paintLayer.appendChild(fragment);
      }
      drawnPosition=position;
    }
    if(angle!==drawnAngle){
      const [x,y,z]=DATA.clock;
      needle.setAttribute('d',k.lineOnTop([x,y],[x+12*Math.sin(angle),y-12*Math.cos(angle)],z,DATA.P));
      drawnAngle=angle;
    }
  }
  function run(){if(!dead&&visible&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function tick(now){
    frame=0;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const movingTour=touring&&!ctx.reduced()&&state&&(state.mode==='scan'||state.k>1);
    if(movingTour){
      clock+=dt;
      // The tour inspects the active lookup path; it never changes lab state.
      const sweep=(1-Math.cos(clock*Math.PI/2.4))/2;
      target=state.mode==='scan'?DATA.scanTravel*sweep:-Math.min(9,state.k-1)*.5*sweep;
    }
    position=ctx.reduced()?target:position+(target-position)*(1-Math.exp(-dt/.22));
    angle=ctx.reduced()?targetAngle:angle+(targetAngle-angle)*(1-Math.exp(-dt/.28));
    if(Math.abs(position-target)<.01)position=target;
    if(Math.abs(angle-targetAngle)<.001)angle=targetAngle;
    draw();
    if(visible&&(movingTour||position!==target||angle!==targetAngle))frame=requestAnimationFrame(tick);
  }
  function arm(delay=3600){
    clearTimeout(timer);
    if(ctx.reduced())return;
    timer=setTimeout(()=>{if(!hover&&!focus){touring=true;clock=0;run();}},delay);
  }
  function pause(){touring=false;clearTimeout(timer);}
  function choose(mode){pause();ctx.set({mode});ctx.announce(ctx.t(`btn.${mode}`));arm();}
  listen(stage,'pointerenter',()=>{hover=true;pause();});
  listen(stage,'pointermove',event=>{
    if(!state)return;
    pause();
    const bounds=stage.getBoundingClientRect();
    const fraction=Math.min(1,Math.max(0,(event.clientX-bounds.left)/bounds.width));
    target=state.mode==='scan'?DATA.scanTravel*fraction:-Math.min(9,state.k-1)*.5*fraction;
    if(ctx.reduced()){position=target;draw();}else run();
  });
  listen(stage,'pointerleave',()=>{hover=false;target=0;run();arm();});
  listen(stage,'click',event=>{
    const part=event.target.closest('[data-lookup]');
    if(!part||!state)return;
    const lookup=part.dataset.lookup;
    choose(lookup==='toggle'?(state.mode==='cached'?'scan':'cached'):lookup);
  });
  listen(root,'focusin',()=>{focus=true;pause();text();});
  listen(root,'focusout',event=>{if(!root.contains(event.relatedTarget)){focus=false;arm();}});
  listen(stage,'keydown',event=>{
    if(!state)return;
    if(['ArrowLeft','ArrowRight','Home','End',' ','Enter','Escape','ArrowUp','ArrowDown'].includes(event.key))event.preventDefault();else return;
    pause();
    if(event.key==='Home'||event.key==='ArrowLeft')choose('cached');
    else if(event.key==='End'||event.key==='ArrowRight')choose('scan');
    else if(event.key===' '||event.key==='Enter')choose(state.mode==='cached'?'scan':'cached');
    else if(event.key==='Escape'){target=0;run();}
    else {metric=(metric+(event.key==='ArrowUp'?1:3))%4;text();}
  });
  buttons.forEach(button=>listen(button,'click',()=>choose(button.dataset.mode)));
  listen(root.querySelector('[data-next]'),'click',()=>{pause();metric=(metric+1)%4;text();arm();});
  const observer=new IntersectionObserver(entries=>{
    visible=entries[entries.length-1].isIntersecting;
    if(visible){run();arm(1400);}else {cancelAnimationFrame(frame);frame=0;clearTimeout(timer);}
  },{rootMargin:'120px 0px'});
  observer.observe(stage);
  function update(s,r){
    state=s;result=r;
    if(!s||!r)return;
    cards.forEach((card,index)=>{card.style.display=index<s.k&&s.mode==='cached'?'':'none';});
    targetAngle=r.metrics[2].value/84*Math.PI*1.75;
    target=0;
    text();
    if(ctx.reduced()){position=target;angle=targetAngle;draw();}else run();
  }
  return {update,relocalize(){text();ctx.announce('');},destroy(){dead=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();listeners.forEach(remove=>remove());}};
}
