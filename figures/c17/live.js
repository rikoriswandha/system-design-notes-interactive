export default function mount(root, ctx, K, DATA) {
  const sweep=root.querySelector('[data-sweep]'), needle=root.querySelector('[data-needle]'), shardNumber=root.querySelector('[data-shards]');
  const dots=[...root.querySelectorAll('[data-blip]')], meters=[...root.querySelectorAll('[data-meter]')], numbers=[...root.querySelectorAll('[data-number]')];
  const knobs=[...root.querySelectorAll('[data-knob]')], knobPositions=[0,0,0,0], knobX=[-104,-76,-48,-20];
  const bearings=dots.map(dot=>Math.atan2(Number(dot.getAttribute('cx')),-Number(dot.getAttribute('cy')))*180/Math.PI);
  let state=ctx.state,result=ctx.result,frame=0,last=0,visible=true,hover=false,focused=false,mode=0,preview=null,angle=0,holdUntil=performance.now()+1400,dead=false;
  const widths=[0,0,0];
  const sample={online:state?.online??0,nearby:state?state.online*state.nearby/100:0,ttl:state?.ttl??600};
  let settling=false;
  let press=null,lastDescription='';
  const listeners=[];
  const on=(event,fn)=>{ctx.stage.addEventListener(event,fn);listeners.push([event,fn]);};
  const fmt=n=>ctx.format(n,{notation:'compact',maximumFractionDigits:1});
  const attr=(node,name,value)=>{const text=String(value);if(node.getAttribute(name)!==text)node.setAttribute(name,text);};
  const follow=(value,target,dt,epsilon)=>ctx.reduced()||Math.abs(value-target)<epsilon?target:value+(target-value)*(1-Math.exp(-dt/0.22));
  function say() {
    if(!state||!result)return;
    const values=result.metrics.map(m=>m.value);
    ctx.readout(mode<4?ctx.t(`read.${mode}`,{n:fmt(values[mode])}):ctx.t('read.age',{interval:ctx.format(state.interval),ttl:ctx.format(state.ttl)}));
    for(let i=0;i<3;i++) numbers[i].textContent=ctx.t('screen',{n:fmt(values[i])});
    shardNumber.textContent=ctx.t('screen.shards',{n:fmt(values[3])});
    ctx.stage.setAttribute('aria-valuenow',state.interval);
  }
  function describe(){if(!state)return;const text=ctx.t('choice',{interval:ctx.format(state.interval),ttl:ctx.format(state.ttl)});if(text!==lastDescription){lastDescription=text;ctx.describe(text);}}
  function draw(dt,touring) {
    if(!state||!result)return;
    const targetInterval=preview??state.interval;
    settling=false;
    const sampleTargets={online:state.online,nearby:state.online*state.nearby/100,ttl:state.ttl};
    for(const key of Object.keys(sample)) {
      sample[key]=follow(sample[key],sampleTargets[key],dt,0.001);
      if(Math.abs(sample[key]-sampleTargets[key])>0.001)settling=true;
    }
    if(touring)angle+=dt/targetInterval*360;
    if(ctx.reduced())angle=0;
    attr(sweep,'transform',`rotate(${angle})`);attr(needle,'transform',`rotate(${angle})`);
    // Exactly 100 percentage-sample dots, not invented geographic identities.
    for(let i=0;i<dots.length;i++) {
      const online=Math.max(0,Math.min(1,sample.online-i));
      const near=Math.max(0,Math.min(1,sample.nearby-i));
      const age=((angle-bearings[i])%360+360)%360/360*state.interval;
      const alpha=ctx.reduced()?1:Math.max(0,1-age/sample.ttl);
      attr(dots[i],'opacity',(0.06+online*0.45+near*0.4)*alpha);
      attr(dots[i],'r',0.9+near*1.2);
    }
    const max=Math.max(1,result.metrics[0].value,result.metrics[1].value,result.metrics[2].value);
    meters.forEach((el,i)=>{
      const targetWidth=44*result.metrics[i].value/max;
      widths[i]=follow(widths[i],targetWidth,dt,0.01);
      if(Math.abs(widths[i]-targetWidth)>0.01)settling=true;
      attr(el,'width',widths[i]);
    });
    const values=[(targetInterval-5)/115,(state.online-1)/99,(state.nearby-1)/99,(state.ttl-30)/1170];
    knobs.forEach((el,i)=>{
      const target=values[i];
      knobPositions[i]=follow(knobPositions[i],target,dt,0.001);
      if(Math.abs(knobPositions[i]-target)>0.001)settling=true;
      const a=(-135+270*knobPositions[i])*Math.PI/180;
      attr(el,'d',K.k.lineOnTop([knobX[i],65],[knobX[i]+3.7*Math.sin(a),65-3.7*Math.cos(a)],7,DATA.P));
    });
  }
  function tick(now){frame=0;if(dead||!visible)return;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;const touring=!ctx.reduced()&&!hover&&!focused&&now>=holdUntil;draw(dt,touring);if(!ctx.reduced()&&(touring||settling))frame=requestAnimationFrame(tick);else if(!ctx.reduced()&&!hover&&!focused)resume();}
  let timer=0;
  function resume(){clearTimeout(timer);timer=setTimeout(run,Math.max(0,holdUntil-performance.now()));}
  function run(){if(!frame&&visible&&!dead){last=0;frame=requestAnimationFrame(tick);}}
  function hold(){holdUntil=performance.now()+3600;clearTimeout(timer);run();}
  function intervalAt(e){const box=ctx.stage.getBoundingClientRect();return Math.max(5,Math.min(120,Math.round((5+115*(e.clientX-box.left)/box.width)/5)*5));}
  on('pointerenter',()=>{hover=true;hold();});
  on('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>=6)press.cancelled=true;preview=e.target.closest('[data-cadence]')?intervalAt(e):null;hold();});
  on('pointerleave',()=>{hover=false;preview=null;hold();resume();});
  on('pointerdown',e=>{press={x:e.clientX,y:e.clientY,cancelled:false};hold();});
  on('pointercancel',()=>{if(press)press.cancelled=true;preview=null;hold();});
  on('click',e=>{const cancelled=press?.cancelled;press=null;if(cancelled||!e.target.closest('[data-cadence]'))return;hold();preview=null;ctx.set({interval:intervalAt(e)});describe();});
  on('focus',()=>{focused=true;hold();describe();});
  on('blur',()=>{focused=false;hold();resume();});
  on('keydown',e=>{
    if(!state)return;
    let value=null;
    if(e.key==='ArrowUp')value=Math.min(120,state.interval+5);
    if(e.key==='ArrowDown')value=Math.max(5,state.interval-5);
    if(e.key==='Home')value=5;if(e.key==='End')value=120;
    if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){mode=(mode+(e.key==='ArrowLeft'?4:1))%5;say();ctx.announce(ctx.t(`phase.${mode}`));}
    else if(e.key==='Escape'){preview=null;mode=0;say();}
    else if(value===null)return;
    e.preventDefault();preview=null;hold();if(value!==null)ctx.set({interval:value});describe();
  });
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){holdUntil=Math.max(holdUntil,performance.now()+1400);run();}else{cancelAnimationFrame(frame);frame=0;clearTimeout(timer);}},{rootMargin:'120px 0px'});observer.observe(ctx.stage);
  function update(s,r){state=s;result=r;say();describe();draw(1/30,false);run();}
  update(state,result);
  return {update,relocalize(){say();describe();ctx.announce('');},destroy(){dead=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();listeners.forEach(([event,fn])=>ctx.stage.removeEventListener(event,fn));}};
}
