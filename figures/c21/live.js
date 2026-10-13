export default function mount(root, ctx, K, DATA) {
  const {k}=K, stage=ctx.stage, gate=root.querySelector('[data-part="gate"]'), stamp=root.querySelector('[data-part="stamp"]');
  const tokens=[...root.querySelectorAll('[data-token]')], bins=[...root.querySelectorAll('[data-bin]')];
  const mask=root.querySelector('[data-event-mask]');
  const clockSwitch=root.querySelector('[data-part="clock"]');
  const ids=[...root.querySelectorAll('[data-token-id]')];
  let state=null,result=null,model=null,frame=0,last=0,visible=false,timer=0,touring=false,clock=0,hover=false,focused=false,preview=null,phaseKey='';
  let gateAt=0,stampAt=0,gateTarget=0,stampTarget=0,clockAt=0,clockTarget=0;
  let maskGate=NaN,maskStamp=NaN;
  let paintedGate=NaN,paintedStamp=NaN,paintedClock=NaN,description='';
  const paintedTokens=tokens.map(()=>[NaN,NaN,NaN,NaN]);
  const positions=tokens.map(()=>[-120,-18,18]), targets=tokens.map(()=>[-120,-18,18]);
  const inputPosition=[-120,-18,16.5],stopPosition=[60,-18,16.5],exitPosition=[60,-18,18],aboveHome=[0,0,18],opacities=tokens.map(()=>0);
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const listen=[];
  const on=(el,name,fn)=>{el.addEventListener(name,fn);listen.push(()=>el.removeEventListener(name,fn));};
  function words(){
    if(!result)return;
    const values=result.metrics.map(m=>ctx.format(m.value));
    ctx.readout(ctx.t('readout',{count:values[0],duplicate:values[1],late:values[2],difference:values[3]}));
    const nextDescription=ctx.t('description',{lateness:ctx.format(state.lateness),dedupe:ctx.t(state.dedupe==='on'?'enabled':'disabled'),clock:ctx.t(state.clock),count:values[0],duplicate:values[1],late:values[2],difference:values[3]});
    if(nextDescription!==description){description=nextDescription;ctx.describe(description);}
    bins.forEach((el,i)=>{const text=ctx.format(i<3?result.table.rows[i][1]:result.metrics[i===3?1:2].value);if(el.textContent!==text)el.textContent=text;});
  }
  function target(){if(!state)return;gateTarget=state.clock==='processing'?20:(preview??state.lateness)/120*20;stampTarget=state.dedupe==='on'?-15:0;clockTarget=state.clock==='processing'?21:0;}
  function draw(){
    if(gateAt!==paintedGate){gate.setAttribute('transform',k.translateAlong(DATA.P,[0,0,gateAt]));paintedGate=gateAt;}
    if(stampAt!==paintedStamp){stamp.setAttribute('transform',k.translateAlong(DATA.P,[0,0,stampAt]));paintedStamp=stampAt;}
    if(clockAt!==paintedClock){clockSwitch.setAttribute('transform',k.translateAlong(DATA.P,[clockAt,0,0]));paintedClock=clockAt;}
    // The inspection plates occlude the travelling token in their reserved painter slots.
    if(!Number.isFinite(maskGate)||Math.abs(gateAt-maskGate)+Math.abs(stampAt-maskStamp)>.001){
      mask.setAttribute('d','M0 0H600V380H0Z'+k.slabOf({x:-6,y:-43,w:4,d:51,r:1},16.5+gateAt,34.5,DATA.P,5,.6).fill+k.slabOf({x:-68,y:-43,w:4,d:51,r:1},39+stampAt,15,DATA.P,5,.6).fill);
      maskGate=gateAt;maskStamp=stampAt;
    }
    tokens.forEach((el,i)=>{
      const p=positions[i],painted=paintedTokens[i];
      if(p.some((v,j)=>v!==painted[j])){el.setAttribute('transform',k.translateAlong(DATA.P,p));for(let j=0;j<3;j++)painted[j]=p[j];}
      if(opacities[i]!==painted[3]){el.setAttribute('opacity',String(opacities[i]));painted[3]=opacities[i];}
    });
  }
  function tick(now){
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced(),alpha=calm?1:1-Math.exp(-dt/.24);
    const activeIndex=touring&&!calm&&model?Math.floor((clock+dt)/3.6)%model.events.length:-1;
    const wantedGate=activeIndex>=0?(model.events[activeIndex].bin===4?0:20):gateTarget;
    gateAt=calm?wantedGate:gateAt+(wantedGate-gateAt)*alpha;
    stampAt=calm?stampTarget:stampAt+(stampTarget-stampAt)*alpha;
    clockAt=calm?clockTarget:clockAt+(clockTarget-clockAt)*alpha;
    if(Math.abs(gateAt-wantedGate)<.01)gateAt=wantedGate;
    if(Math.abs(stampAt-stampTarget)<.01)stampAt=stampTarget;
    if(Math.abs(clockAt-clockTarget)<.01)clockAt=clockTarget;
    let moving=gateAt!==wantedGate||stampAt!==stampTarget||clockAt!==clockTarget;
    positions.forEach((p,i)=>{if(i===activeIndex)return;p.forEach((v,j)=>{p[j]=calm?targets[i][j]:v+(targets[i][j]-v)*alpha;if(Math.abs(p[j]-targets[i][j])<.01)p[j]=targets[i][j];else moving=true;});});
    opacities.forEach((v,i)=>{if(i===activeIndex)return;opacities[i]=calm?1:v+(1-v)*alpha;if(1-opacities[i]<.001)opacities[i]=1;else moving=true;});
    if(touring&&!calm&&model){
      clock+=dt;const cycle=clock/3.6,idx=Math.floor(cycle)%model.events.length,t=cycle%1,event=model.events[idx];
      {
        const home=targets[idx],reject=event.bin>=3,stop=event.bin===3?-73:event.bin===4?-11:60,p=positions[idx];
        stopPosition[0]=stop;
        exitPosition[0]=event.bin===3?-78:event.bin===4?-14:home[0];exitPosition[1]=reject?18:home[1];
        aboveHome[0]=home[0];aboveHome[1]=home[1];
        let from,to,phase;
        if(t>=.2)opacities[idx]=1;
        if(t<.1){from=home;to=home;phase=1;opacities[idx]=1-smooth(t/.1);}
        else if(t<.2){from=inputPosition;to=inputPosition;phase=1;opacities[idx]=smooth((t-.1)/.1);}
        else if(t<.65){from=inputPosition;to=stopPosition;phase=(t-.2)/.45;}
        else if(t<.78){from=stopPosition;to=exitPosition;phase=(t-.65)/.13;}
        else if(t<.9){from=exitPosition;to=aboveHome;phase=(t-.78)/.12;}
        else{from=aboveHome;to=home;phase=(t-.9)/.1;}
        const ease=smooth(phase);
        for(let j=0;j<3;j++)p[j]=from[j]+(to[j]-from[j])*ease;
        const key=`${idx}:${t<.65?'deadline':'decision'}:${ctx.locale}`;
        if(key!==phaseKey){
          phaseKey=key;
          const decision=event.bin===3?ctx.t('duplicateShort'):event.bin===4?ctx.t('lateShort'):ctx.t('windowShort',{window:result.table.rows[event.bin][0]});
          ctx.readout(t<.65&&state.clock==='event'?ctx.t('deadlineReadout',{id:event.id,event:ctx.format(event.eventTime),arrival:ctx.format(event.arrival),deadline:ctx.format(event.deadline)}):ctx.t('eventReadout',{id:event.id,event:ctx.format(event.eventTime),arrival:ctx.format(event.arrival),decision}));
        }
      }
    }
    draw();
    frame=visible&&(moving||(touring&&!calm))?requestAnimationFrame(tick):0;
  }
  function run(){if(visible&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function pause(){touring=false;clearTimeout(timer);phaseKey='';target();words();draw();run();}
  function resume(delay=3600){clearTimeout(timer);if(!ctx.reduced())timer=setTimeout(()=>{if(!hover&&!focused){touring=true;run();}},delay);}
  function update(s,r){
    state=s;result=r;if(!s||!r)return;model=ctx.model(s);target();phaseKey='';
    const offsets=[0,0,0,0,0];
    model.events.forEach((event,i)=>{targets[i]=DATA.destinations[event.bin][offsets[event.bin]++];if(ids[i].textContent!==event.id)ids[i].textContent=event.id;});
    words();run();if(ctx.reduced()){gateAt=gateTarget;stampAt=stampTarget;clockAt=clockTarget;positions.forEach((p,i)=>{positions[i]=[...targets[i]];opacities[i]=1;});draw();}
  }
  function pointerValue(e){const b=stage.getBoundingClientRect();return Math.round(Math.max(0,Math.min(1,(e.clientX-b.left)/b.width))*12)*10;}
  const partAt=e=>e.target.closest('[data-part="clock"],[data-part="stamp"],[data-part="gate"]');
  function commit(values){if(ctx.set(values))ctx.announce(description);}
  on(stage,'pointerenter',()=>{hover=true;pause();});
  on(stage,'pointermove',e=>{preview=partAt(e)?.dataset.part==='gate'?pointerValue(e):null;target();run();});
  on(stage,'pointerleave',()=>{hover=false;preview=null;target();run();resume();});
  on(stage,'pointercancel',()=>{preview=null;target();run();});
  on(stage,'click',e=>{
    const part=partAt(e);if(!state||!part)return;pause();preview=null;
    if(part.dataset.part==='clock')commit({clock:state.clock==='event'?'processing':'event'});
    else if(part.dataset.part==='stamp')commit({dedupe:state.dedupe==='on'?'off':'on'});
    else commit({lateness:pointerValue(e)});
  });
  on(stage,'focus',()=>{focused=true;pause();words();});
  on(stage,'blur',()=>{focused=false;preview=null;target();run();resume();});
  on(stage,'keydown',e=>{if(!state)return;let values;
    if(['ArrowLeft','ArrowDown'].includes(e.key))values={lateness:Math.max(0,state.lateness-10)};
    if(['ArrowRight','ArrowUp'].includes(e.key))values={lateness:Math.min(120,state.lateness+10)};
    if(e.key==='Home')values={lateness:0};if(e.key==='End')values={lateness:120};
    if(e.key===' ')values={dedupe:state.dedupe==='on'?'off':'on'};
    if(e.key==='Enter')values={clock:state.clock==='event'?'processing':'event'};
    if(e.key==='Escape'){preview=null;target();run();}
    if(values){e.preventDefault();pause();preview=null;commit(values);}
  });
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'});observer.observe(stage);resume(1400);
  return {update,destroy(){cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();listen.forEach(remove=>remove());},relocalize(){phaseKey='';words();ctx.announce('');}};
}
