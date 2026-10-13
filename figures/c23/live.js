export default function mount(root, ctx, K, DATA) {
  const {k}=K,P=DATA.P,stage=ctx.stage;
  const refs=Object.fromEntries(['payload','rider','letter','gate'].map(n=>[n,root.querySelector(`[data-email="${n}"]`)]));
  const samples={retry:Array.from({length:DATA.letterCap},(_,i)=>root.querySelector(`[data-email="retry-${i}"]`)),backlog:Array.from({length:DATA.letterCap},(_,i)=>root.querySelector(`[data-email="backlog-${i}"]`))};
  const partLayer=root.querySelector('[data-email-parts]');
  const sorting=DATA.items.map(item=>({...item,node:root.querySelector(`[data-email-item="${item.id}"]`),z:item.key}));
  const paintOrder=sorting.map(item=>item.id);
  const current={retry:0,backlog:0,payload:0,rider:0,letter:0,gate:0},target={...current},painted={};
  const sampleCounts={retry:-1,backlog:-1};
  let state=ctx.state,result=ctx.result,choice=0,hover=false,focused=false,visible=false,frame=0,last=0,clock=0,timer=0,touring=false;
  let gesture=null,lastReadout='',lastDescription='',lastStateKey='';
  const metricText=()=>result?ctx.t('read.'+choice,{value:ctx.format(result.metrics[choice].value,{maximumFractionDigits:2})}):'';
  const show=()=>{const text=metricText();if(text!==lastReadout){lastReadout=text;ctx.readout(text);}};
  const describe=()=>{
    if(!state||!result)return;
    const text=metricText()+'. '+ctx.t('description',{workers:ctx.format(state.workers),failure:ctx.format(state.failure),attempts:ctx.format(result.metrics[0].value),delivered:ctx.format(result.metrics[1].value),backlog:ctx.format(result.metrics[2].value),transfer:ctx.format(result.metrics[3].value)});
    if(text!==lastDescription){lastDescription=text;ctx.describe(text);}
  };
  const draw=()=>{
    let reorder=false;
    for(const name of ['retry','backlog'])if(current[name]!==painted[name]){
      const transform=k.translateAlong(P,[0,current[name]*3,0]);
      for(const sheet of samples[name])sheet.setAttribute('transform',transform);
      painted[name]=current[name];reorder=true;
    }
    if(current.payload!==painted.payload){refs.payload.setAttribute('transform',k.translateAlong(P,[current.payload*3,0,0]));painted.payload=current.payload;reorder=true;}
    if(current.rider!==painted.rider){
      const dial=DATA.gauge,angle=-Math.PI*.8+current.rider*Math.PI*1.6;
      refs.rider.setAttribute('d',k.lineOnTop([dial.x,dial.y],[dial.x+Math.sin(angle)*dial.r,dial.y-Math.cos(angle)*dial.r],dial.z,P));
      painted.rider=current.rider;
    }
    if(current.letter!==painted.letter){refs.letter.setAttribute('transform',k.translateAlong(P,[current.letter*137,0,0]));painted.letter=current.letter;reorder=true;}
    if(current.gate!==painted.gate){refs.gate.setAttribute('transform',k.translateAlong(P,[-12*current.gate,0,0]));painted.gate=current.gate;reorder=true;}
    if(reorder){
      for(const item of sorting)item.z=item.key+item.lift*(current[item.ride]||0);
      sorting.sort((a,b)=>a.z-b.z||a.id-b.id);
      if(sorting.some((item,i)=>item.id!==paintOrder[i])){
        const fragment=document.createDocumentFragment();
        sorting.forEach((item,i)=>{paintOrder[i]=item.id;fragment.append(item.node);});
        partLayer.append(fragment);
      }
    }
  };
  const tourActive=()=>touring&&result&&!ctx.reduced()&&!hover&&!focused;
  const tick=now=>{
    frame=0;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    if(tourActive()){clock+=dt;target.letter=(1-Math.cos(clock*Math.min(1.5,result.table.rows[0][1]/400)))/2;}
    let moving=false;
    for(const n of Object.keys(current)){
      current[n]=ctx.reduced()?target[n]:current[n]+(target[n]-current[n])*(1-Math.exp(-dt/.24));
      if(Math.abs(current[n]-target[n])<.0001)current[n]=target[n];else moving=true;
    }
    draw();if(visible&&(moving||tourActive()))frame=requestAnimationFrame(tick);
  };
  const run=()=>{if(visible&&!frame){last=0;frame=requestAnimationFrame(tick);}};
  const schedule=delay=>{
    clearTimeout(timer);timer=0;
    if(ctx.reduced()||hover||focused)return;
    timer=setTimeout(()=>{timer=0;if(ctx.reduced()||hover||focused)return;touring=true;run();},delay);
  };
  const pause=()=>{
    touring=false;clearTimeout(timer);timer=0;
    if(result)target.letter=Math.min(1,result.metrics[0].value/result.table.rows[0][1]);
    if(ctx.reduced()){Object.assign(current,target);draw();}else run();
    schedule(3600);
  };
  function update(s,r){
    state=s;result=r;if(!s||!r)return;
    const capacity=r.table.rows[0][1],payload=r.table.rows[2][1];
    target.retry=s.failure/80;target.backlog=r.metrics[2].value/(500*60);target.payload=payload/(10+.2*2000*4/3);target.rider=target.payload;target.gate=s.failure/80;target.letter=Math.min(1,r.metrics[0].value/capacity);
    const totals={retry:Math.max(0,r.metrics[0].value-s.rate),backlog:r.metrics[2].value};
    for(const name of ['retry','backlog']){
      const count=Math.min(DATA.letterCap,totals[name]);
      if(count!==sampleCounts[name]){samples[name].forEach((sheet,i)=>sheet.setAttribute('opacity',count>=i+1?'1':'0'));sampleCounts[name]=count;}
    }
    show();
    const stateKey=[s.rate,s.workers,s.failure,s.attachment].join(':');
    if(stateKey!==lastStateKey){lastStateKey=stateKey;describe();}
    if(ctx.reduced()){Object.assign(current,target);draw();}else run();
  }
  const select=n=>{if(choice===n)return;choice=n;show();describe();};
  const move=e=>{
    if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6)gesture.cancelled=true;
    pause();if(!e.target.closest('[data-email-item]'))return;
    const rect=stage.getBoundingClientRect();select(Math.max(0,Math.min(3,Math.floor((e.clientX-rect.left)/rect.width*4))));
  };
  const enter=()=>{hover=true;pause();};const leave=()=>{hover=false;schedule(3600);};
  const focus=()=>{focused=true;pause();describe();};const blur=()=>{focused=false;schedule(3600);};
  const down=e=>{gesture={id:e.pointerId,x:e.clientX,y:e.clientY,part:e.target.closest('[data-email-worker]'),cancelled:false};pause();};
  const cancel=()=>{gesture=null;pause();};
  const up=e=>{if(gesture&&(e.pointerId!==gesture.id||Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6))gesture.cancelled=true;};
  const click=e=>{
    const press=gesture;gesture=null;
    if(!press||press.cancelled||!press.part||e.target.closest('[data-email-worker]')!==press.part)return;
    pause();const rect=stage.getBoundingClientRect();ctx.set({workers:Math.max(1,Math.min(50,Math.round((e.clientX-rect.left)/rect.width*49)+1))});
  };
  const key=e=>{
    if(!state)return;let values=null;const step=e.shiftKey?5:1;
    if(e.key==='ArrowRight')values={workers:Math.min(50,state.workers+step)};
    else if(e.key==='ArrowLeft')values={workers:Math.max(1,state.workers-step)};
    else if(e.key==='ArrowUp')values={failure:Math.min(80,state.failure+5)};
    else if(e.key==='ArrowDown')values={failure:Math.max(0,state.failure-5)};
    else if(e.key==='Home')values={workers:1};else if(e.key==='End')values={workers:50};
    else if(e.key===' '||e.key==='Enter')select((choice+1)%4);
    else if(e.key==='Escape')select(0);
    else return;e.preventDefault();pause();if(values)ctx.set(values);run();
  };
  const listeners={pointermove:move,pointerenter:enter,pointerleave:leave,pointerdown:down,pointerup:up,pointercancel:cancel,click,focus,blur,keydown:key};
  for(const [name,fn]of Object.entries(listeners))stage.addEventListener(name,fn);
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});observer.observe(stage);
  update(state,result);schedule(1400);
  return {update,relocalize(){show();describe();ctx.announce('');},destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();for(const [name,fn]of Object.entries(listeners))stage.removeEventListener(name,fn);}};
}
