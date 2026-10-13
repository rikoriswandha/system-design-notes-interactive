export default function mount(root, ctx, K, DATA) {
  const {k}=K, P=DATA.P, stage=ctx.stage;
  const lock=root.querySelector('[data-lock]'), version=root.querySelector('[data-version]');
  const tickets=[...root.querySelectorAll('[data-ticket]')];
  const issued=[...root.querySelectorAll('[data-issued]')];
  const hanging=[...root.querySelectorAll('[data-rack-key]')].sort((a,b)=>Number(a.dataset.rackKey)-Number(b.dataset.rackKey));
  const weights=[...root.querySelectorAll('[data-key-weight]')].sort((a,b)=>Number(a.dataset.keyWeight)-Number(b.dataset.keyWeight));
  const departures=document.createElementNS('http://www.w3.org/2000/svg','g');
  departures.setAttribute('data-departures','');
  ctx.svg.appendChild(departures);
  const slots=hanging.map(el=>{const slot=document.createComment('room-key-slot');el.before(slot);return slot;});
  const advance=k.axisVector(P,[0,1,0]),rise=k.axisVector(P,[0,0,1]);
  const scaleText=root.querySelector('[data-rack-scale]');
  const rider=root.querySelector('[data-rider]');
  const selector=root.querySelector('[data-selector-needle]');
  const counters=Object.fromEntries([...root.querySelectorAll('[data-counter]')].map(el=>[el.dataset.counter,el]));
  const buttons=[...root.querySelectorAll('[data-mode]')];
  const modes=['optimistic','pessimistic','unsafe'];
  let state, result, preview=null, raf=0,last=0,clock=0,visible=true,dead=false;
  let hover=false,focus=false, idle=0, touring=false, gate=0,shutter=0,position=0,choice=0;
  let gateTarget=0,shutterTarget=0,positionTarget=0,choiceTarget=0,startTimer=0,tourTimer=0;
  let available=0,remaining=0,keyScale=1,release=0,lastRack='',lastChoice='',canTour=false,initialized=false;
  const attr=(el,name,value)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
  const style=(el,name,value)=>{if(el.style[name]!==value)el.style[name]=value;};
  const content=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
  function describeChoice(force=false) {
    if(!state||!result)return;
    const choice=[state.inventory,state.reserved,state.overbook,state.requests,state.rooms,state.mode].join('/');
    if(!force&&choice===lastChoice)return;
    lastChoice=choice;
    ctx.describe(ctx.t('description',{mode:ctx.t('mode.'+state.mode),cap:ctx.format(result.metrics[0].value),final:ctx.format(result.table.rows[1][1]),conflicts:ctx.format(result.metrics[3].value)}));
  }
  function rackNumbers(before) {
    const quantity=before?available:remaining;
    const cache=`${before}/${quantity}/${keyScale}`;
    if(cache===lastRack)return;
    lastRack=cache;
    const count=Math.ceil(quantity/keyScale);
    hanging.forEach((el,i)=>{
      style(el,'display',i<count?'':'none');
      content(weights[i],ctx.format(i<count?Math.min(keyScale,quantity-i*keyScale):0));
    });
    root.dataset.rackPhase=before?'before':'after';
    ctx.readout(ctx.t(quantity===1?'readout.one':'readout.many',{phase:ctx.t(before?'phase.before':'phase.after'),remaining:ctx.format(quantity),scale:ctx.format(keyScale)}));
    content(scaleText,ctx.t('scale',{scale:ctx.format(keyScale)}));
  }
  function text() {
    if(!state||!result)return;
    const m=result.metrics;
    rackNumbers(!ctx.reduced()&&release<.999);
    const values={cap:m[0].value,final:result.table.rows[1][1],accepted:m[1].value,over:m[2].value,conflicts:m[3].value,rooms:state.rooms};
    for(const name in counters)content(counters[name],ctx.format(values[name]));
  }
  function targets() {
    const mode=state?.mode;
    // Preview on the stationary selector, so a guard never escapes the click.
    gateTarget=mode==='pessimistic'?-19:mode==='unsafe'?6:0;
    shutterTarget=mode==='optimistic'?0:9;
    choiceTarget=Math.max(0,modes.indexOf(preview||mode));
  }
  function draw() {
    attr(lock,'transform',k.translateAlong(P,[0,0,gate]));
    attr(version,'transform',k.translateAlong(P,[0,-shutter,0]));
    attr(rider,'transform',k.translateAlong(P,[position,0,0]));
    const angle=(choice-1)*Math.PI/3;
    attr(selector,'d',k.lineOnTop([-55,23],[-55+Math.sin(angle)*4.6,23-Math.cos(angle)*4.6],12.1,P));
    const finalCount=Math.ceil(remaining/keyScale);
    // Clear the hook first, lift above desk contents, then advance and lower.
    // Parallel lanes preserve each key's column and row separation.
    const forward=12*Math.min(1,release/.15)+55*Math.min(1,Math.max(0,(release-.35)/.25));
    const lift=32*Math.min(1,Math.max(0,(release-.15)/.2))-67*Math.min(1,Math.max(0,(release-.6)/.4));
    const dx=advance[0]*forward+rise[0]*lift,dy=advance[1]*forward+rise[1]*lift;
    hanging.forEach((el,i)=>{
      const departing=i>=finalCount;
      const inFlight=departing&&release>0&&release<1;
      if(inFlight){
        if(el.parentNode!==departures)departures.appendChild(el);
      }else{
        const slot=slots[i];
        if(el.parentNode!==slot.parentNode)slot.parentNode.insertBefore(el,slot.nextSibling);
      }
      attr(el,'transform',`translate(${departing?dx:0} ${departing?dy:0})`);
      // Finish fading before lowering starts, never hang visibly above the desk.
      const opacity=departing?Math.max(0,1-Math.max(0,release-.4)/.2):1;
      style(el,'opacity',String(opacity));
      style(el,'visibility',opacity===0?'hidden':'');
    });
    if(state)rackNumbers(!ctx.reduced()&&release<.999);
  }
  function frame(now) {
    raf=0;if(dead||!visible)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced();
    const tourActive=touring&&canTour&&!hover&&!focus&&!calm;
    if(tourActive)clock+=dt;
    const releaseTarget=tourActive&&(clock%7)<2?0:1;
    const follow=(v,t)=>calm||Math.abs(t-v)<.015?t:v+(t-v)*(1-Math.exp(-dt/.24));
    gate=follow(gate,gateTarget);shutter=follow(shutter,shutterTarget);
    position=follow(position,positionTarget);
    choice=follow(choice,choiceTarget);
    release=follow(release,releaseTarget);
    draw();
    const moving=gate!==gateTarget||shutter!==shutterTarget||position!==positionTarget||choice!==choiceTarget||release!==releaseTarget;
    if(!calm&&moving)run();
    else if(tourActive)sleepTour();
  }
  function run(){if(!dead&&visible&&!raf){raf=requestAnimationFrame(frame);}}
  function sleepTour(){
    clearTimeout(tourTimer);
    const phase=clock%7,next=clock+(phase<2?2-phase:7-phase);
    tourTimer=setTimeout(()=>{
      tourTimer=0;
      if(dead||!visible||!touring||!canTour||hover||focus||ctx.reduced())return;
      clock=next;last=0;run();
    },(next-clock)*1000);
  }
  function schedule(delay){clearTimeout(idle);if(!canTour)return;idle=setTimeout(()=>{if(dead||hover||focus||ctx.reduced()||!canTour)return;touring=true;clock=0;last=0;run();},delay);}
  function hold(){touring=false;clearTimeout(startTimer);clearTimeout(idle);clearTimeout(tourTimer);tourTimer=0;last=0;run();}
  function commit(mode){hold();preview=null;ctx.set({mode});targets();ctx.announce(ctx.t('mode.'+mode));schedule(3600);}
  function partMode(target){
    if(!state)return null;
    if(target.closest('[data-selector]'))return modes[(modes.indexOf(state.mode)+1)%3];
    if(target.closest('[data-lock]'))return 'pessimistic';
    if(target.closest('[data-version]'))return 'optimistic';
    return null;
  }
  function move(e){hover=true;hold();preview=partMode(e.target);targets();run();}
  function leave(){hover=false;preview=null;targets();run();schedule(3600);}
  function hoverIn(){hover=true;hold();}
  function unpreview(){preview=null;targets();run();}
  function press(e){hold();preview=partMode(e.target);targets();run();stage.focus({preventScroll:true});}
  function enter(){focus=true;hold();}
  function blur(e){if(root.contains(e.relatedTarget))return;focus=false;preview=null;targets();run();schedule(3600);}
  function key(e){
    if(e.ctrlKey||e.metaKey||e.altKey||!state)return;
    let mode=null;const i=modes.indexOf(state.mode);
    if(e.key==='ArrowRight'||e.key==='ArrowDown')mode=modes[(i+1)%3];
    if(e.key==='ArrowLeft'||e.key==='ArrowUp')mode=modes[(i+2)%3];
    if(e.key==='Home')mode=modes[0];if(e.key==='End')mode=modes[2];
    if(e.key==='Enter'||e.key===' ')mode=preview||modes[(i+1)%3];
    if(e.key==='Escape'){e.preventDefault();preview=null;hold();targets();run();return;}
    if(mode){e.preventDefault();commit(mode);}
  }
  const click=e=>{
    const button=e.target.closest('button[data-mode]');
    const mode=button?button.dataset.mode:partMode(e.target);
    if(mode)commit(mode);
  };
  stage.addEventListener('pointermove',move);stage.addEventListener('pointerleave',unpreview);stage.addEventListener('pointerdown',press);stage.addEventListener('keydown',key);
  root.addEventListener('pointerenter',hoverIn);root.addEventListener('pointerleave',leave);root.addEventListener('focusin',enter);root.addEventListener('focusout',blur);root.addEventListener('click',click);
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){last=0;run();}else{cancelAnimationFrame(raf);raf=0;clearTimeout(tourTimer);tourTimer=0;}},{rootMargin:'120px 0px'});observer.observe(stage);
  function update(s,r){
    state=s;result=r;if(!s||!r)return;preview=null;
    clearTimeout(tourTimer);tourTimer=0;
    tickets.forEach((el,i)=>style(el,'display',i<s.requests?'':'none'));
    issued.forEach((el,i)=>style(el,'display',i<r.metrics[1].value?'':'none'));
    const cap=r.metrics[0].value, final=r.table.rows[1][1];
    available=Math.max(0,cap-s.reserved);
    remaining=Math.max(0,cap-final);
    keyScale=Math.max(1,Math.ceil(available/DATA.hooks.length));
    canTour=Math.ceil(available/keyScale)>Math.ceil(remaining/keyScale);
    if(!canTour){touring=false;release=1;clearTimeout(startTimer);clearTimeout(idle);}
    else if(initialized){touring=false;clearTimeout(startTimer);if(!hover&&!focus)schedule(3600);}
    root.dataset.available=String(available);root.dataset.remaining=String(remaining);root.dataset.keyScale=String(keyScale);
    // The fixed limit pin is at 129 world units. Above-limit reservations move
    // the rider beyond it; the rail saturates and the counter remains exact.
    positionTarget=Math.min(192,129*final/Math.max(1,cap));
    root.dataset.mode=s.mode;root.dataset.final=String(final);root.dataset.limit=String(cap);
    for(const button of buttons)attr(button,'aria-pressed',String(button.dataset.mode===s.mode));
    targets();text();describeChoice();initialized=true;last=0;run();
  }
  function relocalize(){lastRack='';text();describeChoice(true);ctx.announce('');}
  startTimer=setTimeout(()=>{if(canTour&&!hover&&!focus&&!ctx.reduced()){touring=true;run();}},1400);
  return {update,relocalize,destroy(){dead=true;cancelAnimationFrame(raf);clearTimeout(idle);clearTimeout(startTimer);clearTimeout(tourTimer);observer.disconnect();stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerleave',unpreview);stage.removeEventListener('pointerdown',press);stage.removeEventListener('keydown',key);root.removeEventListener('pointerenter',hoverIn);root.removeEventListener('pointerleave',leave);root.removeEventListener('focusin',enter);root.removeEventListener('focusout',blur);root.removeEventListener('click',click);hanging.forEach((el,i)=>{const slot=slots[i];if(slot.parentNode)slot.parentNode.insertBefore(el,slot.nextSibling);slot.remove();});departures.remove();}};
}
