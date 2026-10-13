export default function mount(root, ctx, K, DATA) {
  const { k } = K;
  const tokens = [...root.querySelectorAll('[data-token]')];
  const gate = root.querySelector('[data-gate]');
  const clock = root.querySelector('[data-clock]');
  const needle = root.querySelector('[data-clock-needle]');
  const request = root.querySelector('[data-request]');
  const modes = [...root.querySelectorAll('[data-mode]')];
  const accepted = root.querySelector('[data-accepted]');
  const rejected = root.querySelector('[data-rejected]');
  const caption = root.querySelector('.iso-caption');
  const stage = ctx.stage;
  const machine = root.querySelector('[data-machine]');
  const screens = root.querySelector('[data-screens]');
  const modeButton = root.querySelector('[data-action="mode"]');
  let paintedPosition=NaN, paintedClock=NaN;
  const setAttr=(el,name,value)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
  const layers = [...machine.querySelectorAll(':scope > [data-depth]')].map(el=>({
    el,base:Number(el.dataset.depth),key:Number(el.dataset.depth),piece:el.dataset.piece
  }));
  const gateLayer=layers.find(layer=>layer.piece==='gate');
  const clockLayer=layers.find(layer=>layer.piece==='clock');
  const requestLayer=layers.find(layer=>layer.piece==='request');
  const requestOffset=[0,0,0];
  let frameWindow = null, model = null, raf = 0, last = 0, visible = true;
  let position = 0, target = 0, clockPosition = 0, clockTarget = 0;
  let replay = -1, replayOK = true, preview = false, hovering = false, focusing = false, timer = 0;
  let previousTotal = 0, destroyed = false, described = false;
  const available = () => !model ? 0 : model.algorithm === 'token' ? model.tokens : model.limit - (model.algorithm === 'fixed' ? model.count : model.log.length);
  function describeChoice(){
    if(!model)return;
    ctx.describe(ctx.t('status',{mode:ctx.t(`mode.${model.algorithm}`),left:ctx.format(available(),{maximumFractionDigits:1})}));
    described=true;
  }
  function words() {
    if (!model) { ctx.readout(ctx.t('waiting')); return; }
    const left = ctx.format(available(), {maximumFractionDigits: 1});
    ctx.readout(ctx.t('readout', {left, limit:ctx.format(model.limit), time:ctx.format(model.time,{maximumFractionDigits:1})}));
    for (const [el,value] of [[accepted,model.accepted],[rejected,model.rejected]]) {
      const text=ctx.format(value,{notation:'compact',maximumFractionDigits:1});
      if(el.textContent!==text)el.textContent=text;
      setAttr(el,'font-size',String(Math.min(6,25/(text.length*.65))));
    }
    const modeLabel=ctx.t('btn.mode');
    if(modeButton.textContent!==modeLabel)modeButton.textContent=modeLabel;
    setAttr(modeButton,'aria-label',ctx.t('btn.modeAria',{mode:ctx.t(`mode.${model.algorithm}`)}));
    let captionText = ctx.t(`caption.${model.algorithm}`, {
      refill:ctx.format(model.refill), limit:ctx.format(model.limit),
      start:ctx.format(model.window*10), end:ctx.format((model.window+1)*10),
      used:ctx.format(model.log.length)
    });
    if(preview&&replay>=0)captionText+=' '+ctx.t('caption.preview');
    if(caption.textContent!==captionText)caption.textContent=captionText;
  }
  function draw() {
    let depthChanged=false;
    if(position!==paintedPosition){
      setAttr(gate,'transform',k.translateAlong(DATA.P,[0,0,position*13]));
      gateLayer.key=gateLayer.base+k.depthOf([0,0,position*13],DATA.P);
      paintedPosition=position;depthChanged=true;
    }
    if(clockPosition!==paintedClock){
      setAttr(clock,'transform',k.translateAlong(DATA.P,[clockPosition*45,0,0]));
      const angle=clockPosition*Math.PI*2;
      setAttr(needle,'d',k.lineOnTop(DATA.dial,[DATA.dial[0]+DATA.dialRadius*Math.sin(angle),DATA.dial[1]-DATA.dialRadius*Math.cos(angle)],6.1,DATA.P));
      clockLayer.key=clockLayer.base+k.depthOf([clockPosition*45,0,0],DATA.P);
      paintedClock=clockPosition;depthChanged=true;
    }
    if (replay >= 0 && !ctx.reduced()) {
      const p=Math.min(1,replay/DATA.eventSeconds);
      const route=DATA.routes[preview?'preview':replayOK?'accepted':'rejected'];
      let end=route.findIndex(point=>point[0]>=p);
      if(end<1)end=1;
      const a=route[end-1],b=route[end],t=(p-a[0])/(b[0]-a[0]);
      for(let axis=0;axis<3;axis++)requestOffset[axis]=a[axis+1]+(b[axis+1]-a[axis+1])*t;
      setAttr(request,'transform',k.translateAlong(DATA.P,requestOffset));
      const opacity=String(Math.min(1,p*8,(1-p)*8));
      if(request.style.opacity!==opacity)request.style.opacity=opacity;
    } else {
      if(request.style.opacity!=='0')request.style.opacity='0';
      if(request.hasAttribute('transform'))request.removeAttribute('transform');
      requestOffset.fill(0);
    }
    const requestKey=requestLayer.base+k.depthOf(requestOffset,DATA.P);
    if(requestKey!==requestLayer.key){requestLayer.key=requestKey;depthChanged=true;}
    if(depthChanged){
      layers.sort((a,b)=>a.key-b.key);
      let next=screens;
      for(let i=layers.length-1;i>=0;i--){
        const node=layers[i].el;
        if(node.nextElementSibling!==next)machine.insertBefore(node,next);
        next=node;
      }
    }
  }
  function tick(now) {
    raf=0;
    const dt=last?Math.min((now-last)/1000,1/30):1/60; last=now;
    const calm=ctx.reduced();
    const f=calm?1:1-Math.exp(-dt/.19);
    const admission = replay >= 0 && !preview && replayOK ? 1 : target;
    position+=(admission-position)*f;
    clockPosition+=(clockTarget-clockPosition)*f;
    if(Math.abs(position-admission)<.001)position=admission;
    if(Math.abs(clockPosition-clockTarget)<.001)clockPosition=clockTarget;
    if(replay>=0) {
      replay+=dt;
      if(replay>=DATA.eventSeconds||calm) { replay=-1; words(); if(!hovering&&!focusing)scheduleTour(5000); }
    }
    draw();
    if(visible&&(position!==target||clockPosition!==clockTarget||replay>=0))raf=requestAnimationFrame(tick);
  }
  function kick() { if(!raf&&visible&&!destroyed){last=0;raf=requestAnimationFrame(tick);} }
  function scheduleTour(delay=1400) {
    clearTimeout(timer);
    if(ctx.reduced()||destroyed)return;
    timer=setTimeout(()=>{
      if(visible&&!hovering&&!focusing&&model){
        preview=true; replayOK=available()>=1; replay=0; words(); kick();
      }
    },delay);
  }
  function pull() {
    const next=frameWindow?.LegacyLabState?.rate;
    if(!next)return;
    const total=next.accepted+next.rejected;
    if(total<previousTotal)replay=-1;
    if(model&&total>previousTotal&&!ctx.reduced()) { preview=false; replay=0; replayOK=next.events[next.events.length-1]?.ok ?? false; }
    model=next; previousTotal=total;
    const left=available();
    tokens.forEach((token,i)=>{
      const display=i<Math.floor(left)?'':'none';
      if(token.style.display!==display)token.style.display=display;
    });
    target=left>=1?1:0;
    clockTarget=next.algorithm==='sliding' ? (next.log.length? Math.min(1,(next.time-next.log[0])/10):0) : next.algorithm==='fixed' ? (next.time-next.window*10)/10 : Math.min(1,next.tokens/next.limit);
    modes.forEach((el,i)=>{
      const selected=String(i===['token','fixed','sliding'].indexOf(next.algorithm));
      if(el.dataset.selected!==selected)el.dataset.selected=selected;
    });
    words(); kick();
  }
  function update() {
    frameWindow?.removeEventListener('labstate',pull);
    frameWindow=ctx.frame;
    frameWindow?.addEventListener('labstate',pull);
    pull();
  }
  function interact() { clearTimeout(timer); replay=-1; words(); scheduleTour(3600); }
  function act(action) {
    interact();
    const doc=frameWindow?.document;
    if(!doc||!model)return;
    if(action==='mode') {
      const input=doc.getElementById('algorithm');
      if(!input)return;
      const values=['token','fixed','sliding'];
      input.value=values[(values.indexOf(model.algorithm)+1)%3];
      input.dispatchEvent(new frameWindow.Event('change',{bubbles:true}));
    } else {
      const button=doc.getElementById(action);
      if(!button)return;
      button.click();
    }
    pull();
    describeChoice();
    if(action==='mode')ctx.announce(ctx.t(`mode.${model.algorithm}`));
  }
  function click(e){
    if(e.button!==0)return;
    const button=e.target.closest('[data-action]');
    if(button){act(button.dataset.action);return;}
    if(e.target.closest('[data-part="request-rail"],[data-part="gate"],[data-part="request"]'))act('send');
  }
  function enter(){hovering=true;interact();preview=true;replay=ctx.reduced()?-1:0;target=available()>=1?1:0;words();kick();}
  function leave(){hovering=false;replay=-1;target=available()>=1?1:0;words();kick();scheduleTour(3600);}
  function focus(){focusing=true;interact();}
  function blur(){focusing=false;scheduleTour(3600);}
  function key(e){
    if([' ','Enter','ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End','Escape'].includes(e.key))e.preventDefault();else return;
    if(e.key==='Escape'){interact();draw();return;}
    if(e.key==='Home'||e.key==='End'){
      interact(); const input=frameWindow?.document.getElementById('limit');
      if(input){
        input.value=e.key==='Home'?input.min:input.max;
        input.dispatchEvent(new frameWindow.Event('input',{bubbles:true}));
        pull();describeChoice();
      }
      return;
    }
    if(e.key==='ArrowLeft'&&model){
      interact();const input=frameWindow?.document.getElementById('algorithm');
      if(!input)return;
      const values=['token','fixed','sliding'];input.value=values[(values.indexOf(model.algorithm)+2)%3];input.dispatchEvent(new frameWindow.Event('change',{bubbles:true}));pull();
      describeChoice();
      ctx.announce(ctx.t(`mode.${model.algorithm}`));return;
    }
    act(e.key===' '?e.shiftKey?'burst':'send':e.key==='Enter'||e.key==='ArrowUp'?'tick':e.key==='ArrowDown'?'burst':'mode');
  }
  root.addEventListener('click',click);
  stage.addEventListener('pointerenter',enter);stage.addEventListener('pointerleave',leave);
  stage.addEventListener('focus',focus);stage.addEventListener('blur',blur);stage.addEventListener('keydown',key);
  const observer=new IntersectionObserver(entries=>{
    visible=entries[entries.length-1].isIntersecting;
    if(visible){kick();scheduleTour();}else{cancelAnimationFrame(raf);raf=0;clearTimeout(timer);}
  },{rootMargin:'120px 0px'});observer.observe(stage);
  update();scheduleTour();
  return {update,relocalize(){
    words();
    ctx.announce('');
    if(described)describeChoice();
  },destroy(){
    destroyed=true;cancelAnimationFrame(raf);clearTimeout(timer);observer.disconnect();
    frameWindow?.removeEventListener('labstate',pull);
    root.removeEventListener('click',click);
    stage.removeEventListener('pointerenter',enter);stage.removeEventListener('pointerleave',leave);
    stage.removeEventListener('focus',focus);stage.removeEventListener('blur',blur);stage.removeEventListener('keydown',key);
  }};
}
