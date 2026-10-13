export default function mount(root, ctx, K, DATA) {
  const {k}=K, P=DATA.P, NS='http://www.w3.org/2000/svg';
  const holesRoot=root.querySelector('[data-pins]'),tokensRoot=root.querySelector('[data-pegs]');
  const trace=root.querySelector('[data-successor]'),probe=root.querySelector('[data-selected]'),owner=root.querySelector('[data-owner]');
  const stage=ctx.stage,buttons=[...root.querySelectorAll('[data-action]')];
  let win=null,h=null,changed=null,order=[],choice=0,lift=0,target=0,raf=0,last=0,visible=true,tourTimer=0,held=false,hovered=false,tourIndex=0,dead=false;
  let angle=0,angleTarget=0,ownerAngle=0,ownerTarget=0,initialized=false,geometryKey='',hasDescription=false;
  const tau=Math.PI*2,space=4294967296,KEY_R=70,TOKEN_R=85;
  function el(tag,attrs,parent) {const e=document.createElementNS(NS,tag);for(const [n,v]of Object.entries(attrs))e.setAttribute(n,v);parent.appendChild(e);return e;}
  function paths(markup,parent){const template=document.createElementNS(NS,'g');template.innerHTML=markup;parent.appendChild(template);}
  paths(k.solidSvg(k.cylinder(0,0,3.2,35,8,P,28),{tone:'hi',lit:true})+k.solidSvg(k.cylinder(0,0,6.8,43,2,P,40),{tone:'hi',lit:true}),probe);
  paths(k.solidSvg(k.cylinder(0,0,3.2,35,6,P,28),{tone:'hi'})+k.solidSvg(k.cylinder(0,0,6.8,41,2,P,40),{tone:'hi'}),owner);
  const terminals=[el('circle',{r:.9,fill:'var(--anatomy-lit)'},root.querySelector('[data-machine]')),el('circle',{r:.9,fill:'var(--anatomy-lit)'},root.querySelector('[data-machine]'))];
  const angleOf=value=>value/space*tau-Math.PI/2;
  function pointA(a,r,z=35){return k.iso([r*Math.cos(a),r*Math.sin(a),z],P);}
  function hole(value,radius,worldR,parent,size){return el('path',{d:k.ring(worldR*Math.cos(angleOf(value)),worldR*Math.sin(angleOf(value)),size,35,P,16),class:'iso-line','data-tone':radius},parent);}
  function words(){
    if(!h){ctx.readout(ctx.t('waiting'));return;}
    const moved=h.before?h.map.filter((v,i)=>v!==h.before.map[i]).length:0;
    const mod=h.before?h.mod.filter((v,i)=>v!==h.before.mod[i]).length:0;
    ctx.readout(h.before?ctx.t('moved',{ring:ctx.format(moved),mod:ctx.format(mod)}):ctx.t('initial',{keys:ctx.format(h.keys.length),pegs:ctx.format(h.ring.length)}));
    for(const b of buttons)b.disabled=b.dataset.action==='add'?h.nodes>=6:h.nodes<=2;
  }
  function describe(announce=false){
    if(!h)return;
    const text=ctx.t('selected',{key:ctx.format(choice),node:String.fromCharCode(65+h.map[choice]),count:ctx.format(h.map.filter(n=>n===h.map[choice]).length)});
    ctx.describe(text);hasDescription=true;if(announce)ctx.announce(text);
  }
  function select(i,reader=false,announce=reader){
    if(!h)return;
    const previous=choice;
    choice=(i+h.keys.length)%h.keys.length;
    if(reader&&previous===choice&&initialized){if(announce||!hasDescription)describe(announce);return;}
    probe.dataset.key=choice;probe.dataset.server=h.map[choice];
    const value=h.keys[choice],p=h.ring.find(n=>n.position>=value)||h.ring[0];
    angleTarget=angleOf(value);ownerTarget=angleOf(p.position);
    // Travel along the ring by the shortest arc; the engraved successor route
    // always uses the model's clockwise direction, independently of that travel.
    angleTarget=angle+Math.atan2(Math.sin(angleTarget-angle),Math.cos(angleTarget-angle));
    ownerTarget=ownerAngle+Math.atan2(Math.sin(ownerTarget-ownerAngle),Math.cos(ownerTarget-ownerAngle));
    if(!initialized){angle=angleTarget;ownerAngle=ownerTarget;initialized=true;}
    let end=p.position;if(end<value)end+=space;
    const points=[];for(let j=0;j<=64;j++)points.push(pointA(angleOf(value+(end-value)*j/64),KEY_R));
    points.push(pointA(angleOf(p.position),TOKEN_R));trace.setAttribute('d',k.pathOf(points));
    [points[0],points[points.length-1]].forEach((xy,n)=>{terminals[n].setAttribute('cx',xy[0]);terminals[n].setAttribute('cy',xy[1]);});
    words();run();if(reader&&(previous!==choice||announce||!hasDescription))describe(announce);
  }
  function set(el,name,value){if(el.getAttribute(name)!==value)el.setAttribute(name,value);}
  function draw(){
    const dz=lift*7;
    if(changed)set(changed,'transform',k.translateAlong(P,[0,0,dz]));
    set(probe,'transform',k.translateAlong(P,[KEY_R*Math.cos(angle),KEY_R*Math.sin(angle),h.before&&h.map[choice]!==h.before.map[choice]?dz:0]));
    set(owner,'transform',k.translateAlong(P,[TOKEN_R*Math.cos(ownerAngle),TOKEN_R*Math.sin(ownerAngle),0]));
  }
  function tick(now){
    raf=0;if(!visible||!h||dead)return;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    const calm=ctx.reduced(),follow=1-Math.exp(-dt/.22);
    lift=calm?target:lift+(target-lift)*follow;
    angle=calm?angleTarget:angle+(angleTarget-angle)*follow;
    ownerAngle=calm?ownerTarget:ownerAngle+(ownerTarget-ownerAngle)*follow;
    if(Math.abs(lift-target)<.002)lift=target;
    if(Math.abs(angle-angleTarget)<.001)angle=angleTarget;
    if(Math.abs(ownerAngle-ownerTarget)<.001)ownerAngle=ownerTarget;
    draw();if(lift!==target||angle!==angleTarget||ownerAngle!==ownerTarget)raf=requestAnimationFrame(tick);
  }
  function run(){if(!raf&&visible&&!dead){last=0;raf=requestAnimationFrame(tick);}}
  function schedule(delay=1400){clearTimeout(tourTimer);if(ctx.reduced()||held||!visible||dead)return;tourTimer=setTimeout(()=>{if(h&&!held){select(order[tourIndex++%order.length]);target=target?0:(h.before?1:0);run();schedule(1800);}},delay);}
  function pause(){held=true;clearTimeout(tourTimer);}
  function resume(){held=hovered||stage.contains(document.activeElement);if(!held)schedule(3600);}
  function refresh(){
    const next=win?.LegacyLabState?.hash;if(!next)return;h=next;
    const signature=`${h.nodes}/${h.vnodes}/${h.before?.nodes||0}`;
    if(signature!==geometryKey){
      geometryKey=signature;holesRoot.replaceChildren();tokensRoot.replaceChildren();
      changed=el('g',{'data-moved':''},holesRoot);
      h.keys.forEach((value,i)=>{const moved=h.before&&h.map[i]!==h.before.map[i];const g=el('g',{'data-key':i},moved?changed:holesRoot);hole(value,'lo',KEY_R,g,1.2);});
      order=h.keys.map((value,i)=>({value,i})).sort((a,b)=>a.value-b.value).map(k=>k.i);
      for(const p of h.ring){const g=el('g',{'data-token':p.position,'data-server':p.server},tokensRoot);hole(p.position,'faint',TOKEN_R,g,h.ring.length>64?.5:1);}
      target=h.before?1:0;select(Math.min(choice,h.keys.length-1));run();schedule();
    }else words();
  }
  function update(){
    if(win)win.removeEventListener('labstate',refresh);
    win=ctx.frame;if(win)win.addEventListener('labstate',refresh);
    refresh();
  }
  function commit(action){pause();win?.document.getElementById(action)?.click();describe(true);resume();}
  function pick(e){
    if(!h)return null;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(root.querySelector('[data-machine]').getScreenCTM().inverse());
    let best=null,dist=16*16;
    h.keys.forEach((v,i)=>{const xy=pointA(angleOf(v),KEY_R);const d=(xy[0]-p.x)**2+(xy[1]-p.y)**2;if(d<dist){dist=d;best=i;}});
    return best;
  }
  function pointer(e){pause();const i=pick(e);if(i!==null)select(i,true,false);}
  function click(e){const i=pick(e);if(i===null)return;pause();select(i,true);target=h?.before?1:0;run();}
  function key(e){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' ','Escape'].includes(e.key))return;e.preventDefault();pause();
    const index=order.indexOf(choice);
    if(e.key==='ArrowUp')commit('add');else if(e.key==='ArrowDown')commit('remove');else if(e.key==='Home')select(order[0],true);else if(e.key==='End')select(order[order.length-1],true);else if(e.key==='ArrowLeft')select(order[(index+order.length-1)%order.length],true);else if(e.key==='ArrowRight')select(order[(index+1)%order.length],true);else if(e.key==='Enter'||e.key===' '){target=target?0:(h?.before?1:0);run();}else if(e.key==='Escape'){target=0;run();}
  }
  const handlers=[['pointermove',pointer],['pointerdown',pause],['click',click],['pointerenter',()=>{hovered=true;pause();}],['pointerleave',()=>{hovered=false;resume();}],['focusin',()=>{pause();describe();}],['focusout',e=>{held=hovered||stage.contains(e.relatedTarget);if(!held)schedule(3600);}],['keydown',key]];
  handlers.forEach(([n,f])=>stage.addEventListener(n,f));
  const clicks=buttons.map(b=>{const f=()=>commit(b.dataset.action);b.addEventListener('click',f);return[b,f];});
  const observer=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible){run();schedule();}else{cancelAnimationFrame(raf);raf=0;clearTimeout(tourTimer);}},{rootMargin:'120px 0px'});observer.observe(stage);
  words();
  return {update,relocalize(){words();if(hasDescription)describe();ctx.announce('');},destroy(){dead=true;cancelAnimationFrame(raf);clearTimeout(tourTimer);observer.disconnect();if(win)win.removeEventListener('labstate',refresh);handlers.forEach(([n,f])=>stage.removeEventListener(n,f));clicks.forEach(([b,f])=>b.removeEventListener('click',f));}};
}
