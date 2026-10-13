export default function mount(root, ctx, K, DATA) {
  const stage=ctx.stage;
  const cylinders=[...root.querySelectorAll('[data-cylinder]')];
  const slots=[...root.querySelectorAll('[data-keyway]')];
  const spares=[...root.querySelectorAll('[data-spare]')];
  const bolts=[0,1].map(i=>root.querySelector(`[data-bolt="${i}"]`));
  const links=[...root.querySelectorAll('[data-link]')];
  const needles=[...root.querySelectorAll('[data-needle]')];
  const turnKeys=[...root.querySelectorAll('[data-turn-key]')];
  const turnSpares=[...root.querySelectorAll('[data-turn-spare]')];
  const turns=new Float64Array(14),turnTargets=new Float64Array(14);
  const parts=[...ctx.svg.querySelectorAll('[data-k]')].map((node,rank)=>({node,rank,key:Number(node.dataset.k),lift:Number(node.dataset.lift),piece:node.dataset.piece}));
  let state=ctx.state,result=ctx.result,phase=0,preview=null,frame=0,last=0,visible=true,hover=false,focused=false,timer=0,press=null,suppressClick=false;
  const pos=[0,0,0],target=[0,0,0];
  function attr(el,name,value){if(el.getAttribute(name)!==value)el.setAttribute(name,value);}
  function style(el,name,value){if(el.style[name]!==value)el.style[name]=value;}
  function words(describe=false,announce=false) {
    if(!state||!result)return;
    ctx.readout(ctx.t('readout',{n:state.n,r:state.r,w:state.w}));
    if(describe)ctx.describe(ctx.t('description',{healthy:result.metrics[0].value,n:state.n,read:result.metrics[1].value,write:result.metrics[2].value,overlap:result.metrics[3].value}));
    if(announce)ctx.announce(ctx.t(phase===0?'read':'write',{status:result.metrics[phase+1].value}));
  }
  function paintTargets() {
    if(!state||!result)return;
    const chosen=preview??phase;
    target[0]=chosen===0&&result.metrics[1].value===ctx.t('c06.lab.result.text04')?-24:0;
    target[1]=chosen===1&&result.metrics[2].value===ctx.t('c06.lab.result.text04')?-24:0;
    target[2]=result.metrics[3].value===ctx.t('c06.lab.result.text09')?0:8;
    const healthy=result.metrics[0].value,responders=Math.min(result.bars[chosen+1].value,result.bars[0].value);
    const original=Math.min(healthy,responders),replacement=state.mode==='sloppy'?Math.max(0,responders-original):0;
    for(let i=0;i<7;i++){turnTargets[i]=i<original?90:0;turnTargets[i+7]=i<replacement?90:0;}
    needles.forEach(el=>style(el,'display',Number(el.dataset.needle)===chosen?'':'none'));
  }
  function choose(p,reader=false){const changed=phase!==p;phase=p;preview=null;paintTargets();if(reader)words(changed,true);run();}
  function depth(part){const share=part.piece==='read'?pos[0]/-24:part.piece==='write'?pos[1]/-24:part.piece==='overlap'?pos[2]/8:0;return part.key+part.lift*share;}
  const compareDepth=(a,b)=>depth(a)-depth(b);
  function draw(dt) {
    let moving=false,poseChanged=false;
    const calm=ctx.reduced(),easing=1-Math.exp(-dt/0.22);
    let ready=true;
    for(let i=0;i<14;i++){
      turns[i]=calm?turnTargets[i]:turns[i]+(turnTargets[i]-turns[i])*easing;
      if(Math.abs(turns[i]-turnTargets[i])<0.05)turns[i]=turnTargets[i];else moving=true;
      if(turnTargets[i]===90&&turns[i]<89)ready=false;
    }
    turnKeys.forEach(el=>attr(el,'transform',`rotate(${turns[Number(el.dataset.turnKey)]})`));
    turnSpares.forEach(el=>attr(el,'transform',`rotate(${turns[Number(el.dataset.turnSpare)+7]})`));
    for(let i=0;i<3;i++){
      const goal=i<2&&!ready&&!calm?0:target[i],before=pos[i];
      pos[i]=calm?goal:pos[i]+(goal-pos[i])*easing;
      if(Math.abs(pos[i]-goal)<0.01)pos[i]=goal;else moving=true;
      if(pos[i]!==before)poseChanged=true;
    }
    bolts.forEach((bolt,i)=>attr(bolt,'transform',K.k.translateAlong(DATA.P,[pos[i],0,0])));
    const linkTransform=K.k.translateAlong(DATA.P,[0,pos[2],0]);
    links.forEach(link=>attr(link,'transform',linkTransform));
    if(poseChanged){
      parts.sort(compareDepth);
      let reordered=false;
      parts.forEach((part,rank)=>{if(part.rank!==rank){reordered=true;part.rank=rank;}});
      if(reordered)parts.forEach(part=>ctx.svg.appendChild(part.node));
    }
    return moving;
  }
  function tick(now){frame=0;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;if(draw(dt)&&visible)frame=requestAnimationFrame(tick);}
  function run(){if(visible&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function pause(){clearTimeout(timer);timer=0;}
  function schedule(delay){
    pause();if(ctx.reduced()||hover||focused||!visible)return;
    timer=setTimeout(()=>{timer=0;if(ctx.reduced()||hover||focused||!visible)return;choose(1-phase,false);schedule(2200);},delay);
  }
  // Pointer coordinates are projected into the same viewBox as the actual bolts.
  // Empty paper is not an operation target, including on touch.
  function hit(e){
    const matrix=ctx.svg.getScreenCTM();if(!matrix)return null;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    let picked=null,best=10;
    for(let i=0;i<2;i++){
      const z=i===0?103:74,a=K.k.iso([36,35.5,z],DATA.P),b=K.k.iso([94,35.5,z],DATA.P);
      const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));
      const distance=Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);
      if(distance<best){best=distance;picked=i;}
    }
    return picked;
  }
  function previewAt(p){if(preview===p)return;preview=p;paintTargets();run();}
  function move(e){hover=true;pause();if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>=6)press.cancelled=true;previewAt(hit(e));}
  function leave(){hover=false;previewAt(null);schedule(3600);}
  function down(e){pause();suppressClick=false;press={x:e.clientX,y:e.clientY,cancelled:false};previewAt(hit(e));}
  function cancel(){if(press)press.cancelled=true;previewAt(null);}
  function commit(e){const picked=hit(e);if(picked===null)return;pause();choose(picked,true);schedule(3600);}
  // Sorting a moving SVG part can suppress its native click, so commit a clean
  // pointerup. Ignore its subsequent click to announce the choice exactly once.
  function up(e){if(!press)return;const clean=!press.cancelled&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<6;press=null;suppressClick=true;if(clean)commit(e);}
  function click(e){if(suppressClick){suppressClick=false;return;}const clean=!press||(!press.cancelled&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<6);press=null;if(clean)commit(e);}
  function focus(){focused=true;pause();words(true,false);}
  function blur(){focused=false;previewAt(null);schedule(3600);}
  function key(e){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',' ','Enter','Escape'].includes(e.key))return;
    e.preventDefault();pause();
    if(e.key==='ArrowUp'){ctx.set({failed:Math.max(0,state.failed-1)});words(true,true);}
    else if(e.key==='ArrowDown'){ctx.set({failed:Math.min(7,state.failed+1)});words(true,true);}
    else if(e.key==='Enter'){ctx.set({mode:state.mode==='fixed'?'sloppy':'fixed'});words(true,true);}
    else choose(e.key==='ArrowRight'||e.key==='End'?1:e.key===' '?1-phase:0,true);
  }
  const events={pointermove:move,pointerleave:leave,pointerdown:down,pointerup:up,pointercancel:cancel,click,focus,blur,keydown:key};
  Object.entries(events).forEach(([type,fn])=>stage.addEventListener(type,fn));
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){run();schedule(1400);}else{cancelAnimationFrame(frame);frame=0;pause();}},{rootMargin:'120px 0px'});
  observer.observe(stage);
  function update(s,r){
    const changed=!state||!s||['n','r','w','failed','mode'].some(key=>state[key]!==s[key]);
    state=s;result=r;if(!s||!r)return;
    const healthy=r.metrics[0].value;
    cylinders.forEach(el=>{const i=Number(el.dataset.cylinder);style(el,'display',i<s.n?'':'none');style(el,'opacity',i<healthy?'1':'0.28');});
    slots.forEach(el=>style(el,'display',Number(el.dataset.keyway)<healthy?'':'none'));
    spares.forEach(el=>style(el,'display',Number(el.dataset.spare)<s.n-healthy&&s.mode==='sloppy'?'':'none'));
    words(changed,false);paintTargets();run();
  }
  schedule(1400);
  return {update,destroy(){pause();cancelAnimationFrame(frame);observer.disconnect();Object.entries(events).forEach(([type,fn])=>stage.removeEventListener(type,fn));},relocalize(){update(ctx.state,ctx.result);words(true,false);ctx.announce('');}};
}
