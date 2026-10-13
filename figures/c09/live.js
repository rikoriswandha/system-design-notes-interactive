export default function mount(root, ctx, K, DATA) {
  const { k } = K;
  const stage=ctx.stage;
  const page=root.querySelector('[data-page]');
  const gates=[...root.querySelectorAll('[data-delay]')];
  const cursors=[...root.querySelectorAll('[data-capacity]')];
  const sieve=root.querySelector('[data-sieve]');
  const needles=[...root.querySelectorAll('[data-clock]')].map(el=>({el,y:Number(el.dataset.clock)+11}));
  const volumes=[...root.querySelectorAll('[data-volume]')].map(el=>({
    el,unique:Number(el.dataset.volume)===-45,plan:{x:85,y:Number(el.dataset.volume)+5,w:30,d:30,r:1},
    fill:el.querySelector('.iso-fill'),top:el.querySelector('.iso-top'),
    shades:[...el.querySelectorAll('.iso-shade')],crease:el.querySelector('.iso-crease'),
    bevel:el.querySelector('.iso-bevel'),edge:el.querySelector('.iso-edge'),rim:el.querySelector('[data-volume-rim]'),height:-1
  }));
  const latches=[...root.querySelectorAll('[data-latch]')].map(el=>({
    plan:{x:-10,y:Number(el.dataset.latch)+2,w:5,d:18,r:1},
    fill:el.querySelector('.iso-fill'),top:el.querySelector('.iso-top'),shades:[...el.querySelectorAll('.iso-shade')],
    crease:el.querySelector('.iso-crease'),bevel:el.querySelector('.iso-bevel'),edge:el.querySelector('.iso-edge')
  }));
  let state=ctx.state,result=ctx.result,frame=0,last=0,visible=true,clock=0,phase=0;
  let hovered=false,focused=false,quiet=performance.now()+1400,timer=0;
  let delay=0,target=0,split=0,ratios=[0,0],targets=[0,0],preview=null,pageX=0,release=0;
  let drawnDelay=-1,drawnRelease=-1;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const attr=(el,name,value)=>{if(el&&el.getAttribute(name)!==value)el.setAttribute(name,value);};
  const move=(el,x,y=0,z=0)=>attr(el,'transform',k.translateAlong(DATA.P,[x,y,z]));
  function text() {
    if (!result || !state) return;
    const value=(n)=>ctx.format(n,{maximumFractionDigits:2});
    const names=['rate','unique','storage','bandwidth'];
    ctx.readout(ctx.t(names[phase],{n:value(result.metrics[phase].value)}));
    attr(stage,'aria-valuenow',String(state.delay));
  }
  function describe() { if(state) ctx.describe(ctx.t('description',{delay:ctx.format(state.delay),duplicate:ctx.format(state.duplicate)})); }
  function draw(dt,now) {
    const calm=ctx.reduced();
    const ease=calm?1:1-Math.exp(-dt/.22);
    delay+=(target-delay)*ease;
    split+=((state?.duplicate||0)/100-split)*ease;
    for(let i=0;i<2;i++) {ratios[i]+=(targets[i]-ratios[i])*ease;move(cursors[i],ratios[i]*122);}
    if(Math.abs(delay-drawnDelay)>.001) {
      drawnDelay=delay;
      for(const el of gates) move(el,delay/5000*22);
      const angle=(-150+delay/5000*300)*Math.PI/180;
      for(const {el,y} of needles) attr(el,'d',k.lineOnTop([-7.5,y],[-7.5+Math.sin(angle)*5,y-Math.cos(angle)*5],37.1,DATA.P));
    }
    move(sieve,0,split*25);
    for(const bin of volumes) {
      const share=bin.unique?1-split:split;
      const height=14*share;
      if(Math.abs(height-bin.height)>.001) {
        bin.height=height;
        attr(bin.el,'opacity',share<.001?'0':'1');
        const shape=k.slabOf(bin.plan,3,Math.max(.001,height),DATA.P,4,.5);
        attr(bin.fill,'d',shape.fill);attr(bin.top,'d',shape.top);
        for(const shade of bin.shades) attr(shade,'d',shape.shades[Number(shade.dataset.shade)]);
        attr(bin.crease,'d',shape.crease);attr(bin.bevel,'d',shape.bevel);
        attr(bin.edge,'d',shape.outline);
        attr(bin.rim,'d',k.planOutline(k.insetPlan(bin.plan,2),3+height,DATA.P,4));
      }
    }
    const tour=!calm && !hovered && !focused && now>=quiet;
    let pageTarget=0,releaseTarget=0;
    if(tour) {
      clock+=dt;
      const next=Math.floor(clock/2.6)%4;
      if(next!==phase) {phase=next;text();}
      // A representative page completes a download, then waits at the politeness gate.
      // Cycle duration uses the actual download + post-download delay, slowed for legibility.
      const period=Math.max(2,(state.download+state.delay)/1000);
      const t=(clock%period)/period;
      const eligible=state.download/(state.download+state.delay);
      const travel=Math.min(1,t/eligible);
      pageTarget=travel*34;
      releaseTarget=t<eligible?1:0;
    }
    release+=(releaseTarget-release)*ease;
    if(Math.abs(release-drawnRelease)>.0001) {
      drawnRelease=release;
      for(const latch of latches) {
        const shape=k.slabOf(latch.plan,21+release*6,7-release*6,DATA.P,4,.6);
        attr(latch.fill,'d',shape.fill);attr(latch.top,'d',shape.top);
        for(const shade of latch.shades) attr(shade,'d',shape.shades[Number(shade.dataset.shade)]);
        attr(latch.crease,'d',shape.crease);attr(latch.bevel,'d',shape.bevel);
        attr(latch.edge,'d',shape.outline);
      }
    }
    pageX+=(pageTarget-pageX)*ease;
    move(page,pageX);
    return tour || Math.abs(releaseTarget-release)>.001 || Math.abs(pageTarget-pageX)>.02 || Math.abs(target-delay)>.02 || Math.abs(split-(state?.duplicate||0)/100)>.0001 || ratios.some((v,i)=>Math.abs(v-targets[i])>.0001);
  }
  function tick(now) {
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const again=draw(dt,now);frame=visible&&again?requestAnimationFrame(tick):0;
  }
  function run(){if(!frame&&visible){last=0;frame=requestAnimationFrame(tick);}}
  function schedule(ms){clearTimeout(timer);timer=setTimeout(run,ms);}
  function pause(){quiet=performance.now()+3600;schedule(3600);run();}
  function point(event) {
    const control=event.target.closest?.('[data-delay], [data-delay-control]');
    if(!control||!stage.contains(control))return null;
    const timerId=control.getAttribute('data-delay-control');
    const face=timerId!==null?root.querySelector(`[data-timer-face="${timerId}"]`):control;
    const box=face.getBoundingClientRect();
    if(!box.width)return null;
    return Math.round(clamp((event.clientX-box.left)/box.width,0,1)*50)*100;
  }
  function enter(){hovered=true;pause();}
  function hover(event){preview=point(event);target=preview??state.delay;pause();}
  function leave(){hovered=false;preview=null;target=state?.delay||0;pause();}
  function click(event){const next=point(event);if(next===null)return;pause();if(next!==state.delay)ctx.set({delay:next});}
  function focus(){focused=true;pause();}
  function blur(){focused=false;preview=null;target=state?.delay||0;pause();}
  function cancel(){preview=null;target=state?.delay||0;pause();}
  function key(event){
    let next=null;
    if(['ArrowRight','ArrowUp'].includes(event.key)) next=state.delay+(event.shiftKey?1000:100);
    if(['ArrowLeft','ArrowDown'].includes(event.key)) next=state.delay-(event.shiftKey?1000:100);
    if(event.key==='Home') next=0;
    if(event.key==='End') next=5000;
    if(event.key==='Enter'||event.key===' ') next=preview;
    if(event.key==='Escape'){preview=null;target=state.delay;pause();event.preventDefault();return;}
    if(next===null)return;
    event.preventDefault();preview=null;pause();next=clamp(next,0,5000);if(next!==state.delay)ctx.set({delay:next});
  }
  const events={pointerenter:enter,pointermove:hover,pointerleave:leave,click,pointercancel:cancel,focus,blur,keydown:key};
  for(const [name,fn] of Object.entries(events))stage.addEventListener(name,fn);
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});
  observer.observe(stage);
  function update(s,r){const previous=state;state=s;result=r;if(!s||!r)return;target=s.delay;targets=r.bars.map(b=>b.max?b.value/b.max:0);root.dataset.bottleneck=r.bars[1].value<r.bars[0].value?'hosts':'workers';text();if(previous&&(previous.delay!==s.delay||previous.duplicate!==s.duplicate))describe();if(ctx.reduced())draw(0,performance.now());else run();schedule(Math.max(0,quiet-performance.now()));}
  return {update,relocalize(){text();describe();ctx.announce('');},destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();for(const [name,fn] of Object.entries(events))stage.removeEventListener(name,fn);}};
}
