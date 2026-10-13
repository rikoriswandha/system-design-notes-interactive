export default function mount(root,ctx,K,DATA) {
  const {k}=K,{P,dial,tickets,bidTickets,buyerNames}=DATA;
  const stage=ctx.stage,needle=root.querySelector('[data-needle]');
  const priceX=limit=>DATA.priceFrom+(limit-99)*DATA.priceStep;
  const railOrigin=k.iso([DATA.priceFrom,55,66],P),railAxis=k.axisVector(P,[1,0,0]),railAxisSquared=railAxis[0]*railAxis[0]+railAxis[1]*railAxis[1];
  const priceDisplay=root.querySelector('[data-price-display]'),bidDisplay=root.querySelector('[data-bid-display]');
  const cardRef=name=>{const el=root.querySelector(`[data-part="${name}"]`);return {el,solid:el.querySelector('.iso-solid'),opacity:NaN,visibility:'',tone:''};};
  const askCards=tickets.map(names=>names.map(cardRef));
  const bidCards=bidTickets.map(cardRef);
  const buyer=buyerNames.map(name=>root.querySelector(`[data-part="${name}"]`));
  const ordered=[...root.querySelectorAll('[data-order-key]')].map(el=>({el,key:Number(el.dataset.orderKey),moving:el.dataset.moving==='1'}));
  const previousOrder=ordered.map(item=>item.el);
  const byDepth=(a,b)=>a.currentKey-b.currentKey;
  function sortParts(){
    const offset=(x-DATA.priceFrom)*DATA.depthX;
    for(const item of ordered)item.currentKey=item.key+(item.moving?offset:0);
    ordered.sort(byDepth);
    let changed=false;
    for(let i=0;i<ordered.length;i++)if(previousOrder[i]!==ordered[i].el){changed=true;break;}
    if(changed){
      // Move only nodes whose next sibling changed; avoid detaching the entire
      // SVG and invalidating every static shape and clip on each depth crossing.
      for(let i=ordered.length-1;i>=0;i--){
        const el=ordered[i].el,next=i+1<ordered.length?ordered[i+1].el:null;
        if(el.nextElementSibling!==next)ctx.svg.insertBefore(el,next);
        previousOrder[i]=el;
      }
    }
  }
  let state=null,result=null,rows=[null,null,null,null],frame=0,last=0,visible=false,hover=false,focused=false,timer=0,clock=0,touring=false,replayReady=false,preview=null,initial=true;
  let x=0,targetX=0,counts=[7,3,5,10],targets=[7,3,5,10],bidCount=0,targetBid=0,util=0,targetUtil=0;
  let lastReadout='',paintedCounts=[NaN,NaN,NaN,NaN],paintedBid=NaN,paintedX=NaN,paintedUtil=NaN,gesture=null,paintedGhost=null;
  let dialHover=false;
  let labels={summary:'',path:'',replay:'',loading:'',updating:'',limit:'',quantity:'',preview:''},previewLabel='';
  function localizeReadings(){
    if(!result)return;
    const m=result.metrics,time=typeof m[3].value==='number'?ctx.format(m[3].value)+' '+m[3].unit:ctx.t('unstable');
    labels.summary=ctx.t('readout',{limit:ctx.format(state.limit),filled:ctx.format(m[0].value),left:ctx.format(m[1].value)});
    labels.path=ctx.t('path',{util:ctx.format(result.bars[0].value),time});
    labels.replay=ctx.t('replay');labels.loading=ctx.t('loading');labels.updating=ctx.t('updating');labels.limit=ctx.format(state.limit);labels.quantity=ctx.format(m[1].value);
    if(preview!==null){previewLabel=ctx.format(preview);labels.preview=ctx.t('preview',{limit:previewLabel});}
  }
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function paintCards(cards,count,ghost=false) {
    for(let n=0;n<cards.length;n++){
      const ref=cards[n],opacity=clamp(count-n,0,1)*(ghost?0.32:1),visibility=opacity<.002?'hidden':'visible',tone=ghost?'faint':'hi';
      if(ref.tone!==tone){ref.solid.setAttribute('data-tone',tone);ref.tone=tone;}
      if(ref.opacity!==opacity){ref.el.style.opacity=String(opacity);ref.opacity=opacity;}
      if(ref.visibility!==visibility){ref.el.style.visibility=visibility;ref.visibility=visibility;}
    }
  }
  function words(){
    if(!result)return;
    let quantitiesMoving=Math.abs(bidCount-targetBid)>.002;
    for(let i=0;i<4;i++)if(Math.abs(counts[i]-targets[i])>.002)quantitiesMoving=true;
    const transitioning=quantitiesMoving||Math.abs(util-targetUtil)>.001;
    const hold=touring&&clock%8>=4;
    const text=preview!==null?labels.preview:touring?(!replayReady?labels.loading:hold?labels.summary:labels.replay):transitioning?labels.updating:labels.summary;
    const shown=dialHover&&!transitioning?labels.path:text;
    if(shown!==lastReadout){ctx.readout(shown);lastReadout=shown;}
    const priceText=preview===null?labels.limit:previewLabel,quantityText=(touring&&(!replayReady||clock%8<4))||quantitiesMoving?'—':labels.quantity;
    if(priceDisplay.textContent!==priceText)priceDisplay.textContent=priceText;
    if(bidDisplay.textContent!==quantityText)bidDisplay.textContent=quantityText;
  }
  function describe(){
    if(!result)return;
    const m=result.metrics;
    ctx.describe(ctx.t('status',{limit:ctx.format(state.limit),filled:ctx.format(m[0].value),left:ctx.format(m[1].value),average:typeof m[2].value==='number'?ctx.format(m[2].value)+' '+m[2].unit:m[2].value,time:typeof m[3].value==='number'?ctx.format(m[3].value)+' '+m[3].unit:ctx.t('unstable')})+' '+ctx.t(state.cancel==='yes'?'cancelled':'retained')+' '+ctx.t(state.topology==='memory'?'c28.lab.controls.3.options.1.label':'c28.lab.controls.3.options.0.label'));
    if(stage.getAttribute('aria-valuenow')!==String(state.limit))stage.setAttribute('aria-valuenow',state.limit);
  }
  function draw(){
    const ghost=state?.cancel==='yes';
    for(let i=0;i<4;i++)if(counts[i]!==paintedCounts[i]||Number.isNaN(paintedCounts[i])||(i===0&&ghost!==paintedGhost)){paintCards(askCards[i],i===0&&ghost?askCards[0].length:counts[i],i===0&&ghost);paintedCounts[i]=counts[i];}
    paintedGhost=ghost;
    if(bidCount!==paintedBid||Number.isNaN(paintedBid)){paintCards(bidCards,bidCount);paintedBid=bidCount;}
    if(x!==paintedX){const transform=k.translateAlong(P,[x,0,0]);for(const el of buyer)el.setAttribute('transform',transform);sortParts();paintedX=x;}
    if(util!==paintedUtil){const angle=(-.75+util)*Math.PI;needle.setAttribute('d',k.lineOnTop(dial,[dial[0]+15*Math.sin(angle),dial[1]-15*Math.cos(angle)],25.2,P));paintedUtil=util;}
    words();
  }
  const follow=(v,target,a)=>Math.abs(target-v)<.0005?target:v+(target-v)*a;
  function tick(now){
    frame=0;if(!visible||!result)return;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced();
    if(calm){touring=false;clock=0;}else if(touring&&replayReady){clock+=dt;if(clock>=8){clock=0;replayReady=false;}}
    const progress=touring&&!calm?(replayReady?clamp(clock/4,0,1):0):1;
    const nextX=preview===null?targetX:priceX(preview);
    const a=calm?1:1-Math.exp(-dt/.22);
    x=follow(x,nextX,a);util=follow(util,targetUtil,a);
    // Replay draws only the lab's existing fills, spending that fill budget
    // against A1, then A2, then A3, then A4. It never invents an order.
    let before=0;
    for(let i=0;i<4;i++){
      const row=rows[i],consumed=row?Math.min(row[3],Math.max(0,result.metrics[0].value*progress-before)):0;
      const want=row?(row[2]-consumed)/10:0;
      if(row)before+=row[3];
      counts[i]=follow(counts[i],want,a);
    }
    bidCount=follow(bidCount,(state.quantity-result.metrics[0].value*progress)/10,a);
    if(touring&&!replayReady){
      let loaded=bidCount===state.quantity/10;
      for(let i=0;i<4;i++)if(counts[i]!== (rows[i]?rows[i][2]/10:0))loaded=false;
      if(loaded)replayReady=true;
    }
    draw();
    let moving=x!==nextX||util!==targetUtil||bidCount!==targetBid;
    for(let i=0;i<4;i++)if(counts[i]!==targets[i])moving=true;
    if((moving||touring)&&!calm)frame=requestAnimationFrame(tick);
  }
  function needsFrame(){
    if(!result)return false;
    if(touring&&!ctx.reduced())return true;
    const desiredX=preview===null?targetX:priceX(preview);
    if(x!==desiredX||util!==targetUtil||bidCount!==targetBid||Number.isNaN(paintedX))return true;
    for(let i=0;i<4;i++)if(counts[i]!==targets[i])return true;
    return false;
  }
  function run(){if(!frame&&visible&&needsFrame()){last=0;frame=requestAnimationFrame(tick);}}
  function idle(delay=3600){clearTimeout(timer);timer=setTimeout(()=>{if(!hover&&!focused&&!ctx.reduced()){touring=true;replayReady=false;clock=0;run();}},delay);}
  function pause(){touring=false;clock=0;clearTimeout(timer);words();run();}
  // Project the actual rail into pointer coordinates instead of treating the
  // whole card width as the seven price ticks.
  function price(e){
    const box=ctx.svg.getBoundingClientRect();
    const pointerX=(e.clientX-box.left)*600/box.width,pointerY=(e.clientY-box.top)*380/box.height;
    const part=e.target.closest('[data-part]'),name=part?.dataset.part;
    if(name?.startsWith('price-seat-'))return Number(name.slice(11));
    let origin=railOrigin,offset=0;
    if(name==='ruler')origin=k.iso([DATA.priceFrom,82,.8],P);
    else if(name?.startsWith('rail-'))origin=k.iso([DATA.priceFrom,Number(name.slice(5))+2,63],P);
    else if(part){const bounds=part.getBoundingClientRect();origin=[((bounds.left+bounds.right)/2-box.left)*600/box.width,((bounds.top+bounds.bottom)/2-box.top)*380/box.height];offset=x-DATA.priceFrom;}
    const along=((pointerX-origin[0])*railAxis[0]+(pointerY-origin[1])*railAxis[1])/railAxisSquared;
    return Math.round(99+clamp((offset+along)/DATA.priceStep,0,6));
  }
  function kind(e){
    const name=e.target.closest?.('[data-part]')?.dataset.part;
    if(!name)return null;
    if(name.startsWith('gauge'))return 'topology';
    if(name==='carriage'||name==='ruler'||name.startsWith('rail-')||name.startsWith('price-seat-')||name.startsWith('buyer-')||name.startsWith('bid-')||name.startsWith('bush-'))return 'limit';
    return null;
  }
  function commit(values){
    if(!state)return;
    let changed=false;
    for(const key in values)if(values[key]!==state[key])changed=true;
    if(!changed)return;
    if(ctx.set(values)!==false)ctx.announce('cancel' in values?ctx.t(state.cancel==='yes'?'cancelled':'retained'):'topology' in values?labels.path:labels.summary);
  }
  const move=e=>{
    if(gesture&&e.pointerId===gesture.id&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>=6)gesture.moved=true;
    if(e.pointerType==='touch')return;
    hover=true;pause();
    const target=kind(e);dialHover=target==='topology';const next=target==='limit'?price(e):null;
    if(next!==preview&&next!==null){previewLabel=ctx.format(next);labels.preview=ctx.t('preview',{limit:previewLabel});}
    preview=next;words();run();
  };
  const leave=()=>{hover=false;dialHover=false;preview=null;words();run();idle();};
  const down=e=>{gesture=e.button===0&&e.isPrimary!==false?{id:e.pointerId,x:e.clientX,y:e.clientY,kind:kind(e),moved:false}:null;};
  const cancel=()=>{gesture=null;preview=null;dialHover=false;words();run();};
  const up=e=>{
    const tap=gesture;gesture=null;
    if(!state||!tap||tap.id!==e.pointerId||!tap.kind||tap.kind!==kind(e)||tap.moved||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>=6)return;
    pause();preview=null;
    commit(tap.kind==='topology'?{topology:state.topology==='memory'?'network':'memory'}:{limit:price(e)});
    words();run();
  };
  const focus=()=>{focused=true;pause();};
  const blur=()=>{focused=false;preview=null;words();run();idle();};
  const key=e=>{
    if(!state||e.ctrlKey||e.metaKey||e.altKey)return;
    let values=null;
    if(['ArrowRight','ArrowUp'].includes(e.key))values={limit:Math.min(105,state.limit+1)};
    if(['ArrowLeft','ArrowDown'].includes(e.key))values={limit:Math.max(99,state.limit-1)};
    if(e.key==='Home')values={limit:99};if(e.key==='End')values={limit:105};
    if(e.key===' '||e.key==='Enter')values={cancel:state.cancel==='yes'?'no':'yes'};
    if(e.key.toLowerCase()==='m')values={topology:state.topology==='memory'?'network':'memory'};
    if(e.key==='Escape'){preview=null;pause();run();return;}
    if(values){e.preventDefault();pause();preview=null;commit(values);words();run();}
  };
  const events=[['pointermove',move],['pointerleave',leave],['pointerdown',down],['pointerup',up],['pointercancel',cancel],['focus',focus],['blur',blur],['keydown',key]];
  for(const [name,fn] of events)stage.addEventListener(name,fn);
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;last=0;}},{rootMargin:'120px 0px'});observer.observe(stage);
  return {
    update(s,r){
      if(!s||!r)return;
      const changed=!state||state.limit!==s.limit||state.quantity!==s.quantity||state.cancel!==s.cancel||state.topology!==s.topology||state.load!==s.load;
      state=s;result=r;
      targetX=priceX(s.limit);targetBid=r.metrics[1].value/10;targetUtil=r.bars[0].value/100;
      for(let i=0;i<4;i++){rows[i]=r.table.rows.find(row=>row[0]===`A${i+1}`)||null;targets[i]=rows[i]?rows[i][4]/10:0;}
      touring=false;clock=0;localizeReadings();if(changed)describe();words();
      run();idle(initial?1400:3600);initial=false;
    },
    relocalize(){localizeReadings();lastReadout='';words();describe();ctx.announce('');},
    destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();for(const [name,fn] of events)stage.removeEventListener(name,fn);}
  };
}
