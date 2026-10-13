export default function mount(root, ctx, K, DATA) {
  const { k } = K, P = DATA.P, stage = ctx.stage;
  const gate=root.querySelector('[data-batch-gate]'), selector=root.querySelector('[data-selector]');
  const followers=[...root.querySelectorAll('[data-route]')], samples=[...root.querySelectorAll('[data-sample]')], displays=[...root.querySelectorAll('[data-display]')];
  const routeTimes=[...root.querySelectorAll('[data-route-time]')];
  const scanNodes=[...root.querySelectorAll('[data-scan]')], machine=root.querySelector('[data-machine]');
  const drawn=[...machine.children], marker=root.querySelector('[data-traffic-marker]');
  const nextOrder=drawn.map((_,i)=>i),paintedOrder=Int32Array.from(nextOrder);
  let lastSort=-1,scan=0,scanTarget=0;
  let state=null,result=null,frame=0,last=0,visible=true,dead=false,hover=false,focused=false,timer=0,sampleTimer=0,tour=false,clock=0,lastDescription='';
  let batch=5,traffic=0,targetBatch=5,preview=null,mainAt=18;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const written=new WeakMap();
  function attr(el,name,value){const text=String(value);let cache=written.get(el);if(!cache){cache={};written.set(el,cache);}if(cache[name]!==text){el.setAttribute(name,text);cache[name]=text;}}
  function texts(){
    if(!result)return;
    const values=result.metrics.map(m=>m.value);
    displays[0].textContent=ctx.t('points',{n:ctx.format(values[0])});
    displays[1].textContent=ctx.t('wait',{n:ctx.format(values[2])});
    displays[2].textContent=ctx.t('eta',{n:ctx.format(values[3],{maximumFractionDigits:1})});
    displays[3].textContent=ctx.t('requests',{n:ctx.format(values[1])});
    routeTimes.forEach((el,i)=>{el.textContent=ctx.t('eta',{n:ctx.format(result.table.rows[i][1],{maximumFractionDigits:1})});});
    ctx.readout(ctx.t('readout',{batch:ctx.format(state.batch),eta:ctx.format(values[3],{maximumFractionDigits:1})}));
    attr(stage,'aria-valuenow',state.batch);
    const description=ctx.t(state.batch===1?'description.one':'description',{batch:ctx.format(state.batch),wait:ctx.format(values[2]),route:ctx.t(result.table.rows[0][1]<=result.table.rows[1][1]?'main':'alternative'),eta:ctx.format(values[3],{maximumFractionDigits:1})});
    if(description!==lastDescription){ctx.describe(description);lastDescription=description;}
    samples.forEach((el,i)=>attr(el,'visibility',i<state.batch?'visible':'hidden'));
    attr(followers[1],'transform',k.translateAlong(P,[result.table.rows[1][1],0,0]));
    attr(root,'data-route',result.table.rows[0][1]<=result.table.rows[1][1]?'main':'alternative');
    const angle=(state.traffic-1)/3*Math.PI*1.5-Math.PI*0.75;
    attr(marker,'d',k.lineOnTop([104,-66],[104+Math.sin(angle)*5.2,-66-Math.cos(angle)*5.2],10.1,P));
  }
  function draw(){
    attr(gate,'transform',k.translateAlong(P,[(batch-1)*4,0,0]));
    const alt=result.table.rows[1][1];
    attr(followers[0],'transform',k.translateAlong(P,[mainAt,0,0]));
    const tip=[51.5+mainAt*(1-traffic)+alt*traffic,-35+traffic*27];
    attr(selector,'d',k.lineOnTop([78,7.5],tip,16.2,P));
    scanNodes.forEach(el=>attr(el,'transform',k.translateAlong(P,[scan,0,0])));
    if(scan!==lastSort) {
      nextOrder.sort((a,b)=>DATA.order[a].key+DATA.order[a].lift*scan/44-
        DATA.order[b].key-DATA.order[b].lift*scan/44);
      if(nextOrder.some((value,i)=>value!==paintedOrder[i])) {
        const fragment=document.createDocumentFragment();nextOrder.forEach(i=>fragment.append(drawn[i]));
        machine.append(fragment);paintedOrder.set(nextOrder);
      }
      lastSort=scan;
    }
  }
  function tick(now){
    frame=0;if(dead||!visible||!state)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced();
    if(tour&&!calm) {
      clock+=dt;
      const interval=state.sessions/result.metrics[0].value;
      const index=Math.floor(clock/interval)%state.batch;
      scanTarget=index*4;
    }
    scan=calm?scanTarget:scan+(scanTarget-scan)*(1-Math.exp(-dt/0.3));
    if(Math.abs(scan-scanTarget)<0.001)scan=scanTarget;
    const target=preview===null?targetBatch:preview;
    batch=calm?target:batch+(target-batch)*(1-Math.exp(-dt/0.2));
    const selected=result.table.rows[0][1]<=result.table.rows[1][1]?0:1;
    const desired=selected;
    traffic=calm?desired:traffic+(desired-traffic)*(1-Math.exp(-dt/0.25));
    const mainTarget=result.table.rows[0][1];
    mainAt=calm?mainTarget:mainAt+(mainTarget-mainAt)*(1-Math.exp(-dt/0.25));
    if(Math.abs(mainAt-mainTarget)<0.001)mainAt=mainTarget;
    if(Math.abs(batch-target)<0.001)batch=target;
    if(Math.abs(traffic-desired)<0.001)traffic=desired;
    draw();
    const moving=batch!==target||traffic!==desired||mainAt!==mainTarget||scan!==scanTarget;
    if(moving)run();
    else if(tour&&!calm&&state.batch>1&&!sampleTimer){
      const interval=state.sessions/result.metrics[0].value;
      const remaining=interval-clock%interval;
      sampleTimer=setTimeout(()=>{sampleTimer=0;clock=(Math.floor(clock/interval)+1)*interval+1e-6;last=0;run();},remaining*1000);
    }
  }
  function run(){if(!frame&&visible&&!dead){frame=requestAnimationFrame(tick);}}
  function schedule(delay=3600){clearTimeout(timer);clearTimeout(sampleTimer);sampleTimer=0;tour=false;timer=setTimeout(()=>{if(!hover&&!focused&&!ctx.reduced()&&state?.batch>1){tour=true;clock=0;run();}},delay);}
  function stop(){tour=false;clearTimeout(timer);clearTimeout(sampleTimer);sampleTimer=0;last=0;run();}
  function localPoint(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform(ctx.svg.getScreenCTM().inverse());}
  const batchStart=k.iso([-72,27,10],P),batchEnd=k.iso([-28,27,10],P);
  const batchDx=batchEnd[0]-batchStart[0],batchDy=batchEnd[1]-batchStart[1],batchLength=batchDx*batchDx+batchDy*batchDy;
  function part(e){if(e.target.closest('[data-traffic-knob]'))return 'traffic';if(e.target.closest('[data-batch-ruler],[data-batch-gate]'))return 'batch';return null;}
  function locate(e){const p=localPoint(e),share=((p.x-batchStart[0])*batchDx+(p.y-batchStart[1])*batchDy)/batchLength;return clamp(Math.round(1+share*11),1,12);}
  const handlers={
    pointerenter(){hover=true;stop();},
    pointermove(e){preview=part(e)==='batch'?locate(e):null;run();},
    pointerleave(){hover=false;preview=null;schedule();run();},
    pointerdown(){stop();},
    pointercancel(){preview=null;schedule();run();},
    click(e){const hit=part(e);if(!hit)return;stop();preview=null;ctx.set(hit==='traffic'?{traffic:state.traffic<1.9?3:1}:{batch:locate(e)});schedule();},
    focus(){focused=true;stop();texts();},
    blur(){focused=false;preview=null;schedule();run();},
    keydown(e){
      let next=null;
      if(e.key==='ArrowRight'||e.key==='ArrowUp')next=state.batch+1;
      if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=state.batch-1;
      if(e.key==='Home')next=1;
      if(e.key==='End')next=12;
      if(e.key==='Enter'||e.key===' ') {e.preventDefault();stop();ctx.set({traffic:state.traffic<1.9?3:1});schedule();return;}
      if(e.key==='Escape'){preview=null;stop();schedule();return;}
      if(next!==null){e.preventDefault();preview=null;stop();ctx.set({batch:clamp(next,1,12)});schedule();}
    }
  };
  Object.entries(handlers).forEach(([type,fn])=>stage.addEventListener(type,fn));
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){last=0;run();}else{cancelAnimationFrame(frame);frame=0;clearTimeout(sampleTimer);sampleTimer=0;}},{rootMargin:'120px 0px'});observer.observe(stage);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function motion(){if(reduced.matches){stop();run();}else schedule();}reduced.addEventListener('change',motion);
  schedule(1400);
  return {
    update(s,r){state=s;result=r;if(!s||!r)return;clearTimeout(sampleTimer);sampleTimer=0;targetBatch=s.batch;scanTarget=(s.batch-1)*4;texts();run();},
    relocalize(){texts();ctx.announce('');},
    destroy(){dead=true;cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(sampleTimer);observer.disconnect();reduced.removeEventListener('change',motion);Object.entries(handlers).forEach(([type,fn])=>stage.removeEventListener(type,fn));}
  };
}
