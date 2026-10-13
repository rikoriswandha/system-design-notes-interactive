export default function mount(root, ctx, K, DATA) {
  const {k}=K;
  const gates=[...root.querySelectorAll('[data-gate]')].sort((a,b)=>a.dataset.gate-b.dataset.gate);
  const heads=Array.from({length:24},(_,i)=>[...root.querySelectorAll(`[data-head="${i}"]`)]);
  const bottles=Array.from({length:24},(_,i)=>[...root.querySelectorAll(`[data-bottle="${i}"]`)]);
  const lanes=[...root.querySelectorAll('[data-lane]')].sort((a,b)=>a.dataset.lane-b.dataset.lane);
  const follower=root.querySelector('[data-follower]');
  const counters=Object.fromEntries([...root.querySelectorAll('[data-counter]')].map(el=>[el.dataset.counter,el]));
  let state, result, frame=0,last=0,clock=0,visible=true,hover=false,focus=false,dead=false;
  let resume=0, quietUntil=performance.now()+1400, preview=null, described=null;
  const positions=Array.from({length:24},()=>({x:0,y:0,z:0,g:0,o:1,b:1}));
  let level=0;
  const listeners=[];
  function on(el,name,fn){el.addEventListener(name,fn);listeners.push(()=>el.removeEventListener(name,fn));}
  const drawn=new WeakMap();
  function attr(el,name,value){
    let previous=drawn.get(el);
    if(!previous){previous=Object.create(null);drawn.set(el,previous);}
    const text=String(value);
    if(previous[name]===text)return false;
    previous[name]=text;el.setAttribute(name,text);return true;
  }
  const fmt=n=>ctx.format(n);
  function say(describe=false){
    if(!state||!result)return;
    const [active,capacity,backlog,drain]=result.metrics.map(m=>m.value);
    counters.input.textContent=fmt(state.rate);
    counters.capacity.textContent=fmt(capacity);
    counters.backlog.textContent=fmt(backlog);
    counters.drain.textContent=ctx.t('seconds',{n:fmt(drain)});
    ctx.readout(ctx.t('readout',{a:fmt(active),c:fmt(state.consumers),s:fmt(drain)}));
    if(describe)ctx.describe(ctx.t('describe',{p:fmt(state.partitions),c:fmt(state.consumers),a:fmt(active),r:fmt(state.rate),cap:fmt(capacity),b:fmt(backlog),d:fmt(drain),s:fmt(state.seconds)}));
  }
  function draw(dt,now){
    if(!state||!result)return false;
    const active=result.metrics[0].value;
    const tour=!ctx.reduced()&&!hover&&!focus&&now>=quietUntil;
    if(tour)clock+=dt*Math.min(1,state.rate/result.metrics[1].value);
    let moving=false;
    const f=ctx.reduced()?1:1-Math.exp(-dt/.22);
    for(let i=0;i<24;i++){
      const p=positions[i];
      const assigned=i<active?Math.ceil((state.partitions-i)/active):0;
      const lane=assigned?i+(Math.floor(clock/1.8)%assigned)*active:i;
      const tx=(lane-i)*12;
      const ty=i>=active?-50:0;
      const tg=i<state.partitions?-12:0;
      const to=i<state.consumers?1:0;
      const tb=i<state.partitions?1:0;
      const tz=tour&&i<active?(1-Math.cos(clock*Math.PI*2/1.8+i*.6))*2.5:0;
      for(const [key,target] of [['x',tx],['y',ty],['z',tz],['g',tg],['o',to],['b',tb]]){
        p[key]+=(target-p[key])*f;
        if(Math.abs(target-p[key])<.005)p[key]=target;else moving=true;
      }
      const transform=k.translateAlong(DATA.P,[p.x,p.y,0]);
      const stroke=k.translateAlong(DATA.P,[p.x,p.y,p.z]);
      for(const head of heads[i]){
        const changed=attr(head,'transform',head.hasAttribute('data-stroke')?stroke:transform);
        if(changed&&head.hasAttribute('data-spindle'))k.holdStill(head,k.axisVector(DATA.P,[0,0,p.z]));
        attr(head,'opacity',p.o);
        attr(head,'data-active',i<active?'true':'false');
        attr(head,'pointer-events',i<state.consumers?'auto':'none');
      }
      for(const bottle of bottles[i]){
        attr(bottle,'opacity',p.b);
        attr(bottle,'pointer-events',i<state.partitions?'auto':'none');
      }
      attr(gates[i],'transform',k.translateAlong(DATA.P,[0,0,p.g]));
      attr(gates[i],'opacity',1+p.g/12);
      attr(gates[i],'pointer-events',i<state.partitions?'none':'auto');
      attr(lanes[i],'opacity',.35+.65*p.b);
    }
    const target=result.metrics[2].value/(48000*600)*108;
    level+=(target-level)*f;
    if(Math.abs(level-target)<.005)level=target;else moving=true;
    attr(follower,'transform',k.translateAlong(DATA.P,[level,0,0]));
    attr(root,'data-active',active);
    attr(root,'data-backlog',result.metrics[2].value);
    attr(root,'data-capacity',result.metrics[1].value);
    return moving||tour;
  }
  function tick(now){frame=0;if(dead||!visible)return;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now; if(draw(dt,now))frame=requestAnimationFrame(tick);}
  function run(){if(!frame&&visible&&!dead){last=0;frame=requestAnimationFrame(tick);}}
  function quiet(){quietUntil=performance.now()+3600;clearTimeout(resume);resume=setTimeout(run,3600);run();}
  function choice(e){
    const part=e.target.closest?.('[data-lane],[data-gate],[data-bottle]');
    if(!part||!ctx.svg.contains(part))return null;
    return Number(part.dataset.lane??part.dataset.gate??part.dataset.bottle)+1;
  }
  on(ctx.stage,'pointerenter',()=>{hover=true;quiet();});
  on(ctx.stage,'pointermove',e=>{preview=choice(e);if(preview===null)say();else ctx.readout(ctx.t('preview',{p:fmt(preview)}));quiet();});
  on(ctx.stage,'pointerleave',()=>{hover=false;preview=null;say();quiet();});
  on(ctx.stage,'pointercancel',()=>{preview=null;say();quiet();});
  on(ctx.stage,'click',e=>{const partitions=choice(e);if(state&&partitions!==null){ctx.set({partitions});quiet();}});
  on(ctx.stage,'focus',()=>{focus=true;say();quiet();});
  on(ctx.stage,'blur',()=>{focus=false;quiet();});
  on(ctx.stage,'keydown',e=>{
    if(!state)return;
    let values=null;
    if(e.key==='ArrowRight')values={partitions:Math.min(24,state.partitions+1)};
    if(e.key==='ArrowLeft')values={partitions:Math.max(1,state.partitions-1)};
    if(e.key==='ArrowUp')values={consumers:Math.min(24,state.consumers+1)};
    if(e.key==='ArrowDown')values={consumers:Math.max(1,state.consumers-1)};
    if(e.key==='Home')values={partitions:1};
    if(e.key==='End')values={partitions:24};
    if((e.key==='Enter'||e.key===' ')&&preview!==null)values={partitions:preview};
    if(e.key==='Escape'){preview=null;say();quiet();e.preventDefault();return;}
    if(values){e.preventDefault();ctx.set(values);quiet();}
  });
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});
  observer.observe(ctx.stage);
  resume=setTimeout(run,1400);
  return {
    update(s,r){
      state=s;result=r;if(!s||!r)return;
      const signature=[s.rate,s.partitions,s.consumers,s.seconds].join('/');
      say(signature!==described);described=signature;
      if(ctx.reduced())draw(1,performance.now());else run();
    },
    relocalize(){say(true);ctx.announce('');if(preview!==null)ctx.readout(ctx.t('preview',{p:fmt(preview)}));},
    destroy(){dead=true;cancelAnimationFrame(frame);clearTimeout(resume);observer.disconnect();listeners.forEach(off=>off());}
  };
}
