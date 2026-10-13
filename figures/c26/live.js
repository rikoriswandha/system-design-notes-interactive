export default function mount(root, ctx, K, DATA) {
  const {k}=K;
  const gate=root.querySelector('[data-part="gate"]');
  const gateArm=root.querySelector('[data-part="gate-arm"]');
  const stopEdge=gate.querySelector('.iso-edge');
  gate.style.cursor=gateArm.style.cursor='pointer';
  const receipt=root.querySelector('[data-part="receipt"]');
  const receiptPrint=root.querySelector('[data-part="receipt-print"]');
  const paperPaths=['fill','top','crease','bevel','outline'].map((name)=>[name,receipt.querySelector('.iso-'+(name==='outline'?'edge':name))]);
  const paperShades=[...receipt.querySelectorAll('.iso-shade')];
  const ledger=[...root.querySelectorAll('[data-ledger-item]')];
  const lamp=root.querySelector('[data-part="webhook-needle"]');
  const retryNeedle=root.querySelector('[data-part="retry-needle"]');
  const counters=[...root.querySelectorAll('[data-counter]')];
  const machine=root.querySelector('[data-machine]');
  const items=[...machine.children].map((node,index)=>({node,index,key:Number(node.dataset.key),lift:Number(node.dataset.lift),moving:node.dataset.moving}));
  let order=items.map(item=>item.index).join(',');
  let state=null,result=null,frame=0,last=0,visible=false,clock=0,touring=false,timer=0,hover=false,focused=false;
  let x=0,paper=0,tray=0,lampLevel=0,retryLevel=0,activity=1,selection=0,description='';
  let gesture=null,blockedClick=false;
  const drawn={x:NaN,paper:NaN,tray:NaN,lamp:NaN,retry:NaN,activity:NaN};
  const listeners=[];
  function on(type,fn) {ctx.stage.addEventListener(type,fn);listeners.push([type,fn]);}
  function words() {
    if(!result)return;
    counters.forEach((node,i)=>{const value=ctx.format(result.metrics[i].value);if(node.textContent!==value)node.textContent=value;});
    ctx.readout(ctx.t('read.'+selection,{count:ctx.format(result.metrics[selection].value)}));
  }
  function describe() {
    if(!state)return;
    const value=ctx.t(state.key==='stable'?'stable':'new')+' · '+ctx.t('retries',{count:ctx.format(state.retries)});
    if(value!==description){description=value;ctx.describe(value);}
  }
  function draw(dt=1/30) {
    if(!state||!result)return false;
    const calm=ctx.reduced();
    const want=state.key==='new'?18:0;
    const paperWant=result.metrics[2].value/result.metrics[1].value*18;
    const trayWant=result.metrics[3].value/state.orders*14;
    const activityWant=touring&&!calm&&result.metrics[0].value>state.orders?0.6+0.4*Math.sin(clock*Math.PI/2)**2:1;
    const follow=(a,b,seconds=.24)=>calm?b:Math.abs(a-b)<.005?b:a+(b-a)*(1-Math.exp(-dt/seconds));
    lampLevel=follow(lampLevel,state.webhook/100);
    retryLevel=follow(retryLevel,state.retries/5);
    activity=follow(activity,activityWant,.12);
    if(lampLevel!==drawn.lamp){
      const angle=lampLevel*Math.PI;
      lamp.setAttribute('d',k.lineOnTop([78,-49],[78+Math.sin(angle)*5.6,-49-Math.cos(angle)*5.6],35,DATA.P));
      drawn.lamp=lampLevel;
    }
    if(retryLevel!==drawn.retry){
      const angle=retryLevel*Math.PI;
      retryNeedle.setAttribute('d',k.lineOnTop([-82,-4],[-82+Math.sin(angle)*3.4,-4-Math.cos(angle)*3.4],53.6,DATA.P));
      drawn.retry=retryLevel;
    }
    x=follow(x,want);paper=follow(paper,paperWant);tray=follow(tray,trayWant);
    const orderChanged=x!==drawn.x||tray!==drawn.tray;
    if(x!==drawn.x){
      const transform=k.translateAlong(DATA.P,[x,0,0]);
      gate.setAttribute('transform',transform);gateArm.setAttribute('transform',transform);
      drawn.x=x;
    }
    if(paper!==drawn.paper){
      const paths=k.slabOf({...DATA.paper,d:DATA.paper.d+paper},49,.6,DATA.P,5,.2);
      for(const [name,node] of paperPaths) if(node)node.setAttribute('d',paths[name]);
      for(const node of paperShades)node.setAttribute('d',paths.shades[Number(node.dataset.shade)]);
      receiptPrint.setAttribute('transform',k.translateAlong(DATA.P,[0,paper,0]));
      drawn.paper=paper;
    }
    if(tray!==drawn.tray){
      const transform=k.translateAlong(DATA.P,[0,tray,0]);
      ledger.forEach(node=>node.setAttribute('transform',transform));
      drawn.tray=tray;
    }
    if(activity!==drawn.activity){stopEdge.style.opacity=String(activity);drawn.activity=activity;}
    if(orderChanged){
      const depth=item=>item.key+item.lift*(item.moving==='ledger'?tray/7:x/18);
      const sorted=[...items].sort((a,b)=>depth(a)-depth(b));
      const nextOrder=sorted.map(item=>item.index).join(',');
      if(nextOrder!==order){const fragment=document.createDocumentFragment();sorted.forEach(item=>fragment.appendChild(item.node));machine.appendChild(fragment);order=nextOrder;}
    }
    return x!==want||paper!==paperWant||tray!==trayWant||lampLevel!==state.webhook/100||retryLevel!==state.retries/5||activity!==activityWant;
  }
  function tick(now) {
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const flowing=touring&&!ctx.reduced()&&result&&state&&result.metrics[0].value>state.orders;
    if(flowing)clock+=dt;
    const moving=draw(dt);
    frame=visible&&(moving||flowing)?requestAnimationFrame(tick):0;
  }
  function run() {if(ctx.reduced()){cancelAnimationFrame(frame);frame=0;draw();return;}if(visible&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function resume(delay=3600) {
    clearTimeout(timer);timer=0;
    if(ctx.reduced()||hover||focused)return;
    timer=setTimeout(()=>{timer=0;if(ctx.reduced()||hover||focused||!visible)return;touring=true;clock=0;run();},delay);
  }
  function pause() {touring=false;clearTimeout(timer);timer=0;run();}
  function commit(values) {pause();ctx.set(values);resume();}
  on('pointerenter',()=>{hover=true;pause();});
  on('pointermove',e=>{if(gesture&&e.pointerId===gesture.id&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6)blockedClick=true;pause();});
  on('pointerleave',()=>{hover=false;run();resume();});
  on('pointerdown',e=>{gesture={id:e.pointerId,x:e.clientX,y:e.clientY};blockedClick=false;pause();});
  on('pointerup',e=>{if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6)blockedClick=true;gesture=null;});
  on('pointercancel',()=>{gesture=null;blockedClick=true;});
  on('click',e=>{
    if(!state||blockedClick||!e.target.closest('[data-part="gate"],[data-part="gate-arm"]'))return;
    commit({key:state.key==='stable'?'new':'stable'});
    ctx.stage.focus({preventScroll:true});
  });
  on('focus',()=>{focused=true;pause();describe();});
  on('blur',()=>{focused=false;run();resume();});
  on('keydown',e=>{
    if(!state)return;
    let values=null;
    if(e.key===' '||e.key==='Enter')values={key:state.key==='stable'?'new':'stable'};
    if(e.key==='ArrowRight'||e.key==='ArrowUp')values={retries:Math.min(5,state.retries+1)};
    if(e.key==='ArrowLeft'||e.key==='ArrowDown')values={retries:Math.max(0,state.retries-1)};
    if(e.key==='Home')values={key:'stable'};
    if(e.key==='End')values={key:'new'};
    if(e.key==='Escape'){e.preventDefault();pause();return;}
    if(values){e.preventDefault();commit(values);}
  });
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){run();resume(1400);}else{cancelAnimationFrame(frame);frame=0;clearTimeout(timer);timer=0;}},{rootMargin:'120px 0px'});
  observer.observe(ctx.stage);
  return {
    update(s,r){state=s;result=r;if(!s||!r)return;selection=r.metrics[2].value>0?2:r.metrics[3].value>0?3:1;words();describe();run();},
    relocalize(){words();describe();ctx.announce('');},
    destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();listeners.forEach(([type,fn])=>ctx.stage.removeEventListener(type,fn));}
  };
}
