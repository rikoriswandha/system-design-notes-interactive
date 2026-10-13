export default function mount(root, ctx, K, DATA) {
  const { k, G }=K, P=DATA.P, stage=ctx.stage;
  const blocks=root.querySelector('[data-part="blocks"]'), packet=root.querySelector('[data-part="packet"]');
  const payload=root.querySelector('[data-part="payload"]');
  const paintNodes=[...root.querySelectorAll('[data-static-index]')];
  let paintSlot=-1;
  const press=root.querySelector('[data-part="press"]'), gate=root.querySelector('[data-part="gate"]'), jaw=root.querySelector('[data-part="jaw"]');
  const stem=root.querySelector('[data-part="stem"]');
  function refs(node){
    return {paths:{fill:node.querySelector('.iso-fill'),top:node.querySelector('.iso-top'),crease:node.querySelector('.iso-crease'),bevel:node.querySelector('.iso-bevel'),outline:node.querySelector('.iso-edge')},shades:[0,1,2,3].map(i=>node.querySelector('[data-shade="'+i+'"]')),inner:node.querySelector('.iso-line:not(.iso-crease):not(.iso-bevel):not(.iso-edge)')};
  }
  const stemRefs=refs(stem),payloadRefs=refs(payload),irisRefs=refs(jaw);
  const irisBlades=jaw.querySelector('.c15-iris-blades');
  const irisAperture=jaw.querySelector('.c15-iris-aperture');
  function writePaths(ref,paths){for(const [name,node]of Object.entries(ref.paths))if(node)node.setAttribute('d',paths[name]);ref.shades.forEach((node,i)=>{if(node)node.setAttribute('d',paths.shades[i]);});}
  let state=ctx.state,result=ctx.result, phase=0,target=0,position=0,frame=0,last=0,clock=0,touring=false,visible=true,hover=false,focused=false,timer=0,destroyed=false;
  let compression=15,reuse=0,bandwidth=.1,amount=1,rawRatio=1,deltaRatio=1,lift=0;
  const drawn={position:NaN,compression:NaN,reuse:NaN,bandwidth:NaN,amount:NaN,lift:NaN};
  let lastReadout='',describedChoice='';
  const grid={file:null,block:null,touched:null,plans:[],nodes:new Map()};
  const stops=[0,28,69,87],phaseStarts=[0,5.2,9.2,13.2];
  const compressionTarget=()=>phase===0?15:(state.compression-20)/80*15;
  const amountTarget=()=>phase===0?1:phase===1?rawRatio:deltaRatio;
  const fmt=n=>ctx.format(n,{maximumFractionDigits:2});
  function settled(){return state&&position===target&&lift===(phase===3?DATA.deliveryLift:0)&&compression===compressionTarget()&&reuse===state.dedup/90*19&&bandwidth===state.bandwidth/100&&amount===amountTarget();}
  function text() {
    if(!result)return;
    const read=settled()?ctx.t(['read.manifest','read.touched','read.transfer','read.time'][phase],{value:fmt(result.metrics[phase].value)}):ctx.t('read.adjusting');
    if(read!==lastReadout){ctx.readout(read);lastReadout=read;}
  }
  function describe(){
    if(!result)return;
    const value=ctx.t('description',{blocks:fmt(result.metrics[0].value),touched:fmt(result.metrics[1].value),transfer:fmt(result.metrics[2].value),time:fmt(result.metrics[3].value)});
    const choice=phase+'|'+value;
    if(choice!==describedChoice){ctx.describe(value);describedChoice=choice;}
  }
  function select(next,reader=false) {
    next=Math.max(0,Math.min(3,next));
    const changed=next!==phase;
    phase=next;target=stops[phase];
    if(reader){describe();ctx.announce(ctx.t('phase.'+phase));}
    if(changed){text();run();}
  }
  function draw() {
    if(position!==drawn.position||lift!==drawn.lift){
      packet.setAttribute('transform',k.translateAlong(P,[position,0,lift]));
      const orders=lift>0?DATA.sledOrder.lift:DATA.sledOrder.horizontal;
      const coordinate=lift>0?lift:position;
      const index=Math.min(orders.length-1,Math.round(coordinate*DATA.sledOrder.resolution)),slot=orders[index];
      if(slot!==paintSlot){ctx.svg.insertBefore(packet,paintNodes[slot]||null);paintSlot=slot;}
      drawn.position=position;drawn.lift=lift;
    }
    if(compression!==drawn.compression){
      press.setAttribute('transform',k.translateAlong(P,[0,0,compression]));
      const stemPlan={x:21,y:-1,w:5,d:5,r:1},bottom=29+compression;
      writePaths(stemRefs,k.slabOf(stemPlan,bottom,64-bottom,P,4,.5));
      stemRefs.inner.setAttribute('d',k.sideSeam(stemPlan,bottom+(64-bottom)*.45,P,4));
      drawn.compression=compression;
    }
    if(reuse!==drawn.reuse){gate.setAttribute('transform',k.translateAlong(P,[reuse,0,0]));drawn.reuse=reuse;}
    if(bandwidth!==drawn.bandwidth){
      const radius=3*Math.sqrt(bandwidth);
      writePaths(irisRefs,G.ringBand(71,72,radius,6,DATA.iris,P,{steps:64}));
      irisBlades.setAttribute('d',G.spokesOf(DATA.iris,72,radius,6,6,P,{sweep:.2}));
      irisAperture.setAttribute('d',G.circleOf(DATA.iris,72,radius,P,64));
      drawn.bandwidth=bandwidth;
    }
    if(amount!==drawn.amount){
      const side=Math.sqrt(amount),plan={x:11-10*side,y:9-8*side,w:20*side,d:16*side,r:.6*side};
      writePaths(payloadRefs,k.slabOf(plan,10,5,P,4,.4));
      payloadRefs.inner.setAttribute('d',k.planOutline(k.insetPlan(plan,Math.min(.8,plan.w*.2,plan.d*.2)),15,P,4));
      drawn.amount=amount;
    }
  }
  function tick(now) {
    frame=0;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    if(touring&&!ctx.reduced()){clock+=dt;const t=clock%18.2,next=t<5.2?0:t<9.2?1:t<13.2?2:3;if(next!==phase)select(next);}
    const c=compressionTarget(),r=state.dedup/90*19,b=state.bandwidth/100,a=amountTarget();
    const follow=(x,t,epsilon=.01)=>ctx.reduced()||Math.abs(x-t)<epsilon?t:x+(t-x)*(1-Math.exp(-dt/.24));
    // Keep the sled on its rail: arrive at the lift before rising; return to
    // the rail before travelling back through the compression press.
    const horizontal=lift>0&&phase!==3?87:target;
    position=follow(position,horizontal);
    const liftTo=phase===3&&position===87?DATA.deliveryLift:0;
    lift=follow(lift,liftTo);
    compression=follow(compression,c);reuse=follow(reuse,r);bandwidth=follow(bandwidth,b,.00001);amount=follow(amount,a,.000001);draw();text();
    if(visible&&(touring&&!ctx.reduced()||position!==target||lift!==liftTo||compression!==c||reuse!==r||bandwidth!==b||amount!==a))run();
  }
  function run(){if(!frame&&visible&&!destroyed){frame=requestAnimationFrame(tick);}}
  function schedule(delay){clearTimeout(timer);timer=setTimeout(()=>{if(!hover&&!focused&&!ctx.reduced()){touring=true;clock=phaseStarts[phase];run();}},delay);}
  function hold(){touring=false;clearTimeout(timer);schedule(3600);if(!settled())run();}
  function point(e){const part=e.target.closest('[data-fig-phase]');return part&&stage.contains(part)?Number(part.dataset.figPhase):null;}
  const handlers={
    pointerenter(){hover=true;hold();},
    pointermove(e){const next=point(e);if(e.pointerType==='mouse'&&next!==null){hold();select(next);}},
    pointerleave(){hover=false;schedule(3600);},
    pointerdown(e){if(point(e)!==null){hold();stage.focus({preventScroll:true});}},
    click(e){const next=point(e);if(next===null)return;hold();select(next,true);stage.focus({preventScroll:true});},
    focus(){focused=true;hold();text();describe();},
    blur(){focused=false;schedule(3600);},
    keydown(e){if(e.ctrlKey||e.metaKey||e.altKey)return;let value=null;
      if(e.key==='ArrowRight'||e.key==='ArrowUp')value=Math.min(16,state.block+(e.shiftKey?4:1));
      if(e.key==='ArrowLeft'||e.key==='ArrowDown')value=Math.max(1,state.block-(e.shiftKey?4:1));
      if(e.key==='Home')value=1;if(e.key==='End')value=16;
      if(value!==null){e.preventDefault();hold();ctx.set({block:value});return;}
      if(e.key===' '||e.key==='Enter'){e.preventDefault();hold();select((phase+1)%4,true);}
      if(e.key==='Escape'){e.preventDefault();hold();select(0,true);}
    }
  };
  for(const [name,fn]of Object.entries(handlers))stage.addEventListener(name,fn);
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){last=0;run();}else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});observer.observe(stage);
  function refreshGrid(s,count,touched){
    const geometryChanged=grid.file!==s.file||grid.block!==s.block;
    if(!geometryChanged&&grid.touched===touched)return;
    if(geometryChanged){
      const cols=Math.ceil(Math.sqrt(count*1.6)),rows=Math.ceil(count/cols),cw=99/cols,ch=58/rows;
      grid.plans=Array.from({length:count},(_,i)=>{
        const fraction=i===count-1?(s.file-(count-1)*s.block)/s.block:1;
        return {x:-124+(i%cols)*cw,y:-29+Math.floor(i/cols)*ch,w:cw*.91*fraction,d:ch*.91,r:Math.min(.6,cw*.1,ch*.1)};
      });
      for(const [index,node]of grid.nodes)if(index>=count){node.remove();grid.nodes.delete(index);}
    }
    for(let index=0;index<count;index++){
      let node=grid.nodes.get(index);
      const on=index<touched,wasOn=index<grid.touched;
      if(!geometryChanged&&on===wasOn)continue;
      if(!node){node=document.createElementNS('http://www.w3.org/2000/svg','g');node.dataset.block=String(index);grid.nodes.set(index,node);}
      const plan=grid.plans[index],height=on?6:3,top=5+height;
      node.dataset.touched=String(on);
      node.innerHTML=k.solidSvg(k.slabOf(plan,5,height,P,3,.2),{tone:on?'hi':'lo'})+k.lineSvg(k.planOutline(k.insetPlan(plan,Math.min(.8,plan.w*.2,plan.d*.2)),top,P,3),{tone:'faint'});
    }
    if(geometryChanged){
      const indices=grid.plans.map((plan,index)=>({index,depth:k.depthOf([plan.x,plan.y,6],P)})).sort((a,b)=>a.depth-b.depth);
      const fragment=document.createDocumentFragment();
      for(const {index}of indices)fragment.append(grid.nodes.get(index));
      blocks.append(fragment);grid.file=s.file;grid.block=s.block;
    }
    grid.touched=touched;
  }
  function update(s,r){state=s;result=r;if(!s||!r)return;
    const count=r.metrics[0].value,touched=r.metrics[1].value;
    refreshGrid(s,count,touched);
    deltaRatio=r.bars[1].value/s.file;
    rawRatio=Math.min(1,deltaRatio/(s.compression/100*(1-s.dedup/100)));
    root.dataset.manifest=String(count);root.dataset.touched=String(touched);root.dataset.transfer=String(r.metrics[2].value);
    if(ctx.reduced()){position=target;lift=phase===3?DATA.deliveryLift:0;compression=compressionTarget();reuse=s.dedup/90*19;bandwidth=s.bandwidth/100;amount=amountTarget();draw();}else if(settled())draw();else run();
    text();describe();
  }
  update(state,result);schedule(1400);
  return {update,relocalize(){text();describe();ctx.announce('');},destroy(){destroyed=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();for(const [name,fn]of Object.entries(handlers))stage.removeEventListener(name,fn);}};
}
