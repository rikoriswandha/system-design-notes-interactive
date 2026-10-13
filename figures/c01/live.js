export default function mount(root, ctx, K, DATA) {
  const {k}=K, stage=ctx.stage;
  const needles=DATA.gauges.map(g=>root.querySelector(`[data-needle="${g.name}"]`));
  const cachePointer=root.querySelector('[data-cache-pointer]');
  const pumps=DATA.pumps.map((_,i)=>[...root.querySelectorAll(`[data-pump="${i}"]`)]);
  const names=['incoming','cache','database','overflow'];
  const meterCenters=DATA.gauges.map(g=>k.iso([g.x,g.y,g.z],DATA.P));
  const buttons=[...root.querySelectorAll('[data-action]')];
  const levels=DATA.levels.map(level=>({...level,el:root.querySelector(`[data-level="${level.name}"]`),current:0,target:0,painted:NaN}));
  const axisX=k.axisVector(DATA.P,[1,0,0]),axisY=k.axisVector(DATA.P,[0,1,0]);
  const determinant=axisX[0]*axisY[1]-axisX[1]*axisY[0];
  let frameWindow=null, snapshot=null, selected=0, preview=null, raf=0, last=0, visible=false, dead=false;
  let idleTimer=0, tourTimer=0, hover=false, focused=false, paintedSelection=-1, paintedText='', paintedCache=NaN;
  const current=[0,0,0,0], target=[0,0,0,0], painted=[NaN,NaN,NaN,NaN];
  function say() {
    if(!snapshot){ctx.readout(ctx.t('waiting')); return;}
    const m=snapshot.model;
    const values=[snapshot.rps,snapshot.hit,m.dbOffered,m.drop];
    const index=preview===null?selected:preview;
    const text=ctx.t(`readout.${index}`,{value:ctx.format(values[index],{maximumFractionDigits:0})});
    if(text!==paintedText){ctx.readout(text);paintedText=text;}
    if(index!==paintedSelection){
      needles.forEach((n,i)=>{
        n.setAttribute('data-tone',i===index?'lit':'mid');
        n.style.strokeWidth=i===index?'1.2':'.65';
      });
      stage.setAttribute('data-meter',names[index]);
      paintedSelection=index;
    }
  }
  function describe(){
    if(!snapshot)return;
    const values=[snapshot.rps,snapshot.hit,snapshot.model.dbOffered,snapshot.model.drop];
    const choice=ctx.t(`readout.${selected}`,{value:ctx.format(values[selected],{maximumFractionDigits:0})});
    ctx.describe(choice+'. '+ctx.t('state',{incoming:ctx.format(snapshot.rps),active:ctx.format(snapshot.model.active),hit:ctx.format(snapshot.hit),served:ctx.format(snapshot.model.served,{maximumFractionDigits:0}),drop:ctx.format(snapshot.model.drop,{maximumFractionDigits:0})}));
  }
  function draw(dt) {
    let moving=false;
    for(let i=0;i<4;i++){
      current[i]=ctx.reduced()?target[i]:current[i]+(target[i]-current[i])*(1-Math.exp(-dt/.24));
      if(Math.abs(current[i]-target[i])<.0001)current[i]=target[i];else moving=true;
      if(painted[i]!==current[i]){
        const g=DATA.gauges[i],a=-Math.PI*.75+Math.PI*1.5*current[i];
        needles[i].setAttribute('d',k.lineOnTop([g.x-Math.sin(a)*2,g.y+Math.cos(a)*2],[g.x+Math.sin(a)*g.r,g.y-Math.cos(a)*g.r],g.z,DATA.P));
        painted[i]=current[i];
      }
    }
    if(paintedCache!==current[1]){
      const cacheAngle=-Math.PI*.75+Math.PI*1.5*current[1];
      cachePointer.setAttribute('d',k.lineOnTop([-91,24],[-91+Math.sin(cacheAngle)*6.3,24-Math.cos(cacheAngle)*6.3],15.2,DATA.P));
      paintedCache=current[1];
    }
    for(const level of levels){
      level.current=ctx.reduced()?level.target:level.current+(level.target-level.current)*(1-Math.exp(-dt/.24));
      if(Math.abs(level.current-level.target)<.0001)level.current=level.target;else moving=true;
      if(level.painted!==level.current){
        level.el.setAttribute('transform',`translate(0 ${-level.travel*level.current})`);
        level.painted=level.current;
      }
    }
    return moving;
  }
  function tick(now){
    raf=0;if(dead||!visible)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const moving=draw(dt);
    if(moving)raf=requestAnimationFrame(tick);
  }
  function run(){
    const dirty=current.some((value,i)=>value!==target[i]||painted[i]!==value)||levels.some(level=>level.current!==level.target||level.painted!==level.current);
    if(dirty&&!raf&&visible&&!dead){last=0;raf=requestAnimationFrame(tick);}
  }
  function stopTour(){clearTimeout(tourTimer);tourTimer=0;}
  function tourStep(){
    tourTimer=0;
    if(dead||!visible||hover||focused||ctx.reduced())return;
    selected=(selected+1)%4;
    say();
    tourTimer=setTimeout(tourStep,2100);
  }
  function idle(delay){
    clearTimeout(idleTimer);stopTour();
    idleTimer=setTimeout(()=>{
      idleTimer=0;
      if(!dead&&visible&&!hover&&!focused&&!ctx.reduced())tourTimer=setTimeout(tourStep,2100);
    },delay);
  }
  function hold(){idle(3600);}
  function take(detail){
    const next=detail?.scaling;if(!next)return;
    snapshot=next;
    target[0]=next.rps/6000;target[1]=next.hit/100;
    // Database offered demand is not completed work. Its dial reaches full scale at
    // the largest allowed offered load; the readout reports the exact demand.
    target[2]=next.model.dbOffered/6000;target[3]=next.model.drop/6000;
    for(const level of levels){
      if(level.name==='cache')level.target=next.hit/100;
      else if(level.name==='database')level.target=Math.min(1,next.model.dbLoad/100);
      else {
        const index=Number(level.name.slice(4));
        level.target=index>=next.model.active?0:Math.min(1,next.model.appLoad/100);
      }
    }
    pumps.forEach((parts,i)=>parts.forEach(el=>{
      el.style.display=i<next.servers?'':'none';
      const failed=next.down&&i===next.servers-1;
      el.querySelectorAll('[data-tone]').forEach(path=>{
        if(!path.dataset.restTone)path.dataset.restTone=path.getAttribute('data-tone');
        path.setAttribute('data-tone',failed?'faint':path.dataset.restTone);
      });
    }));
    buttons[0].disabled=next.servers>=8;buttons[1].disabled=next.hit>=95;
    buttons[2].textContent=ctx.t(next.down?'restore':'failure');
    buttons[2].setAttribute('aria-pressed',String(next.down));
    say();if(ctx.reduced())draw(0);run();
  }
  const labstate=e=>take(e.detail);
  function update(){
    // WindowProxy identity survives an iframe navigation, but its listeners do not.
    frameWindow?.removeEventListener('labstate',labstate);
    frameWindow=ctx.frame;
    frameWindow?.addEventListener('labstate',labstate);
    take(frameWindow?.LegacyLabState);
  }
  function input(id,value){const el=frameWindow?.document.getElementById(id);if(!el)return;el.value=String(value);el.dispatchEvent(new frameWindow.Event('input',{bubbles:true}));}
  function act(action,speak=true){
    if(!snapshot)return false;
    const before=snapshot;
    hold();
    if(action==='add')input('servers',Math.min(8,snapshot.servers+1));
    if(action==='cache')input('cache',Math.min(95,snapshot.hit+5));
    if(action==='failure')frameWindow?.document.getElementById('failure')?.click();
    const changed=before.servers!==snapshot.servers||before.hit!==snapshot.hit||before.down!==snapshot.down;
    if(changed&&speak)describe();
    return changed;
  }
  const click=e=>{
    const button=e.target.closest('[data-action]');
    if(button){act(button.dataset.action);return;}
    if(!stage.contains(e.target))return;
    if(e.target.closest('[data-cache-knob]')){
      const changed=selected!==1;
      selected=1;preview=null;
      if(!act('cache')&&changed)describe();
      say();return;
    }
    const index=pick(e);
    if(index===null)return;
    const changed=selected!==index;
    selected=index;preview=null;hold();say();
    if(changed)describe();
  };
  const enter=()=>{hover=true;hold();};
  const leave=()=>{hover=false;preview=null;say();idle(3600);};
  const focus=()=>{focused=true;hold();describe();};
  const blur=()=>{focused=false;idle(3600);};
  function pick(e){
    const box=ctx.svg.getBoundingClientRect();
    const x=(e.clientX-box.left)*600/box.width,y=(e.clientY-box.top)*380/box.height;
    let index=null,best=1;
    meterCenters.forEach(([cx,cy],i)=>{
      const dx=x-cx,dy=y-cy;
      const u=(dx*axisY[1]-dy*axisY[0])/determinant;
      const v=(dy*axisX[0]-dx*axisX[1])/determinant;
      const distance=(u*u+v*v)/(DATA.gauges[i].r+8)**2;
      if(distance<=best){best=distance;index=i;}
    });
    return index;
  }
  function move(e){
    preview=e.target.closest('[data-cache-knob]')?1:pick(e);
    say();
  }
  function press(e){
    hold();
    preview=e.target.closest('[data-cache-knob]')?1:pick(e);
    say();
  }
  function key(e){
    if(e.target!==stage||!snapshot)return;
    const before=snapshot,choice=selected;
    let handled=true;
    if(e.key==='ArrowRight')input('traffic',Math.min(6000,snapshot.rps+(e.shiftKey?500:100)));
    else if(e.key==='ArrowLeft')input('traffic',Math.max(100,snapshot.rps-(e.shiftKey?500:100)));
    else if(e.key==='ArrowUp')act('add',false);
    else if(e.key==='ArrowDown')input('servers',Math.max(1,snapshot.servers-1));
    else if(e.key==='Home')input('traffic',100);
    else if(e.key==='End')input('traffic',6000);
    else if(e.key===' '||e.key==='Enter')act('failure',false);
    else if(e.key==='Escape'){preview=null;selected=0;say();}
    else handled=false;
    if(handled){
      e.preventDefault();hold();
      if(choice!==selected||before.rps!==snapshot.rps||before.servers!==snapshot.servers||before.down!==snapshot.down)describe();
    }
  }
  root.addEventListener('click',click);stage.addEventListener('pointerenter',enter);stage.addEventListener('pointerleave',leave);stage.addEventListener('pointermove',move);stage.addEventListener('pointerdown',press);stage.addEventListener('focus',focus);stage.addEventListener('blur',blur);stage.addEventListener('keydown',key);
  const observer=new IntersectionObserver(entries=>{
    visible=entries[entries.length-1].isIntersecting;
    if(visible){run();idle(1400);}
    else{cancelAnimationFrame(raf);raf=0;clearTimeout(idleTimer);stopTour();}
  },{rootMargin:'120px 0px'});observer.observe(stage);
  update();idle(1400);
  return {update,relocalize(){take(frameWindow?.LegacyLabState);describe();ctx.announce('');},destroy(){dead=true;cancelAnimationFrame(raf);clearTimeout(idleTimer);stopTour();observer.disconnect();frameWindow?.removeEventListener('labstate',labstate);root.removeEventListener('click',click);stage.removeEventListener('pointerenter',enter);stage.removeEventListener('pointerleave',leave);stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerdown',press);stage.removeEventListener('focus',focus);stage.removeEventListener('blur',blur);stage.removeEventListener('keydown',key);}};
}
