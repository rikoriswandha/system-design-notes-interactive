export default function mount(root, ctx, K, DATA) {
  const stage = ctx.stage;
  const shuttle = [...root.querySelectorAll('[data-shuttle-base]')];
  const head = [...root.querySelectorAll('[data-shuttle-head]')];
  const cards = [...root.querySelectorAll('[data-feed-card]')];
  const active = root.querySelector('[data-active]');
  const buttons = [...root.querySelectorAll('[data-mode]')];
  const modes = ['push','pull','hybrid'];
  let state, result, metric = 0, visible = false, frame = 0, last = 0, clock = 0;
  let x = 0, target = 0, z = 0, targetZ = 0, share = 1, wantShare = 1, a = 0, wantA = 0;
  let held = false, resume = 0, destroyed = false;
  let drawnX = NaN, drawnZ = NaN, drawnShare = NaN, drawnA = NaN;
  const events = [];
  function listen(el, name, fn) { el.addEventListener(name,fn); events.push(()=>el.removeEventListener(name,fn)); }
  function text() {
    if (!result) return;
    const names = ['inserts','useful','merge','workers','active'];
    const value = metric === 4 ? result.bars[0].value : result.metrics[metric].value;
    ctx.readout(ctx.t('read.'+names[metric], { value: ctx.format(value) }));
    ctx.describe(ctx.t('description',{ mode:ctx.t('mode.'+state.mode), writes:ctx.format(result.metrics[0].value), useful:ctx.format(result.metrics[1].value), merge:ctx.format(result.metrics[2].value), workers:ctx.format(result.metrics[3].value), active:ctx.format(result.bars[0].value) }));
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode)));
  }
  function draw() {
    if(x!==drawnX){
      const transform=K.k.translateAlong(DATA.P,[x,0,0]);
      shuttle.forEach(el=>el.setAttribute('transform',transform));
    }
    if(x!==drawnX||z!==drawnZ){
      const lift=K.k.translateAlong(DATA.P,[x,0,z]);
      head.forEach(el=>el.setAttribute('transform',lift));
    }
    if(share!==drawnShare)cards.forEach(el=>el.setAttribute('opacity',String(share)));
    if(a!==drawnA)active.setAttribute('transform',K.k.translateAlong(DATA.P,[a*150,0,0]));
    drawnX=x;drawnZ=z;drawnShare=share;drawnA=a;
  }
  function run() { if (!frame && visible && !destroyed) { last=0; frame=requestAnimationFrame(tick); } }
  function tick(now) {
    frame=0;
    const dt=last?Math.min((now-last)/1000,1/30):1/60; last=now;
    const still=ctx.reduced();
    const tour=!still&&!held&&now>=resume;
    if (tour && result) {
      clock+=dt;
      // A deliberately schematic tour: one head visits the sampled feed bays.
      // Neither the bay count nor animation duration claims to count real jobs.
      const pulling=result.metrics[0].value===0;
      const step=Math.floor(clock/1.8);
      if(pulling){
        target=step%2?220:7;
        targetZ=0;
      }else{
        target=70+(step%4)*50;
        targetZ=Math.floor(step/4)%3*40;
      }
    }
    const f=still?1:1-Math.exp(-dt/.24);
    x+=(target-x)*f; z+=(targetZ-z)*f; share+=(wantShare-share)*f; a+=(wantA-a)*f;
    if(Math.abs(target-x)<.01)x=target;
    if(Math.abs(targetZ-z)<.01)z=targetZ;
    if(Math.abs(wantShare-share)<.001)share=wantShare;
    if(Math.abs(wantA-a)<.001)a=wantA;
    draw();
    if(visible&&(tour||x!==target||z!==targetZ||share!==wantShare||a!==wantA)) frame=requestAnimationFrame(tick);
  }
  let timer=0;
  function schedule(delay) { clearTimeout(timer); resume=performance.now()+delay; timer=setTimeout(run,delay); }
  function pause() { held=true; clearTimeout(timer); run(); }
  function release() { held=stage.matches(':hover')||stage.matches(':focus');if(!held)schedule(3600); }
  function commit(mode) {
    pause();
    if(ctx.set({mode}))ctx.announce(ctx.t('phase.'+(result.metrics[0].value===0?'collect':'copy')));
    if(!stage.matches(':hover')&&!stage.matches(':focus'))release();
  }
  listen(stage,'pointerenter',pause);
  listen(stage,'pointermove',event=>{
    const rect=stage.getBoundingClientRect();
    const u=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    const v=Math.max(0,Math.min(1,1-(event.clientY-rect.top)/rect.height));
    target=7+u*213;
    targetZ=wantShare?Math.min(2,Math.floor(v*3))*40:0;
    run();
  });
  listen(stage,'click',event=>{
    if(event.target.closest('[data-shuttle-head]'))commit(modes[(modes.indexOf(state.mode)+1)%3]);
  });
  listen(stage,'pointerleave',release);
  listen(stage,'focus',pause);
  listen(stage,'blur',release);
  listen(stage,'keydown',event=>{
    let index=modes.indexOf(state.mode);
    if(event.key==='ArrowRight'||event.key==='ArrowUp')index=(index+1)%3;
    else if(event.key==='ArrowLeft'||event.key==='ArrowDown')index=(index+2)%3;
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=2;
    else if(event.key===' '||event.key==='Enter'){event.preventDefault();metric=(metric+1)%5;text();return;}
    else if(event.key==='Escape'){event.preventDefault();target=7;targetZ=0;run();return;}
    else return;
    event.preventDefault();commit(modes[index]);
  });
  buttons.forEach(button=>listen(button,'click',()=>commit(button.dataset.mode)));
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});
  observer.observe(stage);
  schedule(1400);
  return {
    update(next, evaluated) {
      state=next;result=evaluated;if(!result)return;
      wantShare=result.metrics[0].value>0?1:0;
      wantA=result.bars[0].value/result.bars[0].max;
      target=wantShare?70:7;targetZ=0;clock=0;
      metric=result.metrics[0].value===0?2:0;
      text();if(ctx.reduced()){x=target;z=targetZ;share=wantShare;a=wantA;draw();}else run();
    },
    relocalize(){text();ctx.announce('');},
    destroy(){destroyed=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();events.forEach(remove=>remove());}
  };
}
