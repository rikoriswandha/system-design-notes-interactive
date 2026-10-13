import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// A postal sorting bench, with actual rollers, axle caps, pigeonholes, stamps and scale.
// Stations are fixed illustrative hardware; visible letter samples are model-driven.
export async function build({ argv }) {
  const base={x:-142,y:-82,w:284,d:164,r:5};
  const P=k.fitProjection([...k.boxCorners(base,-7,0),...k.boxCorners({x:-114,y:-69,w:170,d:11,r:1},42,98),...k.boxCorners(base,0,42)],WIDTH,HEIGHT,{pad:45,azimuth:48,elevation:25});
  const {S,L,D,halo}=painter(P);
  const R=A.recorder(P);let count=0;
  const put=(name,at,paths,shape,{tone='mid',inner='',live='',lit=false}={})=>{
    const art=S(paths,{tone,inner,lit});
    const ride=live.startsWith('retry-')?'retry':live.startsWith('backlog-')?'backlog':live||'desk';
    const move={retry:[0,3,0],backlog:[0,3,0],payload:[3,0,0],letter:[137,0,0],gate:[-12,0,0]}[ride]||[0,0,0];
    R.put({name,piece:ride,ride,move,at,svg:live?`<g data-email="${live}">${art}</g>`:art,shapes:[R.solid(shape)]});count++;
  };
  const box=(name,x,y,w,d,z,h,tone='mid',live='',detail='')=>{
    const plan={x,y,w,d,r:Math.min(1.3,w/4,d/4)};
    put(name,[x+w/2,y+d/2,z+h/2],k.slabOf(plan,z,h,P,4,.5),A.slab(plan,z,h,{name},4),{tone,live,inner:L(k.sideSeam(plan,z+h*.65,P,4),{tone:'faint'})+detail});return plan;
  };
  const disc=(name,centre,axis,s0,s1,r,tone='mid',inner='')=>{
    const F=G.frameAlong(centre,axis);put(name,G.pointOf(F,(s0+s1)/2,0,0),G.disc(s0,s1,r,F,P,{bevel:.4}),A.disc(F,s0,s1,r,{name}),{tone,inner});return F;
  };
  const screws=(plan,z,size=.55)=>{
    const pts=k.corners(plan,Math.min(3,plan.w/4,plan.d/4));
    return pts.map(([x,y])=>L(k.ring(x,y,1.25,z,P,16),{tone:'lo'})).join('')+D(k.pointsAt(pts.map(([x,y])=>[x,y,z]),P),{size,tone:'mid'});
  };
  const topPlate=(name,x,y,w,d,z,h,tone='mid',live='')=>box(name,x,y,w,d,z,h,tone,live,screws({x,y,w,d,r:1},z+h));
  for(const [x,y]of [[-125,-65],[116,-65],[-125,58],[116,58]]){
    topPlate('stand.foot'+count,x-3,y-3,15,15,-7,7,'lo');
    box('leg'+count,x,y,9,9,0,31);
    box('leg.collar'+count,x-2,y-2,13,13,31,6,'mid');
  }
  // A hollow braced underframe replaces the former broad bare floor slab.
  for(const y of [-62,61])box('brace.long'+count,-116,y,232,4,12,5,'lo');
  for(const x of [-122,119])box('brace.short'+count,x,-56,4,114,12,5,'lo');
  topPlate('deck',-132,-72,264,144,37,5,'lo');
  for(const [x,y,w,d]of [[-132,-72,264,3],[-132,69,264,3],[-132,-69,3,138],[129,-69,3,138]])box('rim'+count,x,y,w,d,42,3);
  // Three-column, three-row pigeonhole cabinet; all dividers sit on real shelves.
  for(const z of [44,62,80]){
    const fasteners=[-109,-62,-53,-6,3,50].flatMap(x=>[[x,-67,z+3],[x,-67,z+13]]);
    box('pigeon.back'+z,-114,-69,170,2,z,16,'lo','',D(k.pointsAt(fasteners,P),{size:.45,tone:'mid'}));
  }
  for(const z of [42,60,78,96])box('pigeon.shelf'+z,-114,-69,170,11,z,2,'mid');
  for(const x of [-114,-58,-2,54])for(const z of [44,62,80])box('pigeon.divider'+x+'.'+z,x,-67,2,9,z,16,'mid');
  for(const z of [44,62,80])for(const x of [-101,-45,11]){
    box('pigeon.label'+count,x,-59.2,28,1.2,z,3,'lo','',D(k.pointsAt([[x+1,-58,z+1.5],[x+27,-58,z+1.5]],P),{size:.4,tone:'mid'}));
  }
  box('belt.floor',-112,-21,186,40,42,2,'lo');
  topPlate('rail.back',-114,-25,190,4,42,11);
  topPlate('rail.front',-114,19,190,5,42,11);
  for(let i=0;i<12;i++){
    const x=-106+i*14.7;
    disc('roller'+i,[x,-21,48.5],[0,1,0],0,40,4.5,'hi');
    const F=disc('axle.cap'+i,[x,24,48.5],[0,1,0],0,1.6,2.8,'mid');
    const face=G.circleOf(F,1.6,1.1,P);
    R.items[R.items.length-1].svg+=L(face,{tone:'lo'});
  }
  for(let i=0;i<3;i++){
    const x=-100+i*53;
    topPlate('station.mount'+i,x,-58,27,27,42,3);
    box('station.post'+i,x+10,-52,6,8,45,28);
    box('station.arm'+i,x+10,-44,6,25,69,4);
    box('station.rubber'+i,x+3,-19,20,12,61,2,'lo');
    topPlate('station.stamp'+i,x+3,-19,20,12,63,6,'hi');
    disc('stamp.stem'+i,[x+13,-13,69],[0,0,1],0,6,2.5,'mid');
    const F=disc('stamp.grip'+i,[x+13,-13,75],[0,0,1],0,5,5.5,'hi');
    R.items[R.items.length-1].svg+=L(G.circleOf(F,5,3.7,P),{tone:'lo'});
    topPlate('station.cap'+i,x+7,-56,14,16,73,3);
    const crown=disc('station.adjuster'+i,[x+14,-48,76],[0,0,1],0,4,3.7,'mid');
    R.items[R.items.length-1].svg+=k.fadedSvg(G.ribsOf(crown,0,4,3.7,24,P,{fade:[.08,.45],seams:true}),{tone:'lo'});
  }
  const tray=(name,x,y,w,d)=>{
    topPlate(name+'.floor',x,y,w,d,42,2,'lo');
    box(name+'.back',x,y,w,3,44,13);
    box(name+'.left',x,y+3,3,d-3,44,13);
    box(name+'.right',x+w-3,y+3,3,d-3,44,13);
    box(name+'.lip',x+3,y+d-3,w-6,3,44,5);
    box(name+'.handle.left',x+14,y+d,3,3,44,4);
    box(name+'.handle.right',x+w-17,y+d,3,3,44,4);
    box(name+'.handle.bar',x+14,y+d+3,w-28,3,44,4);
  };
  tray('retry',-110,34,66,28);tray('queue',-32,34,70,28);
  const letter=(name,x,y,w,d,z,live)=>{
    const flap=L(k.onTop([[x,y],[x+w/2,y+d*.6],[x+w,y]],z+1,P),{tone:'hi'});
    box(name,x,y,w,d,z,1,'hi',live,flap);
  };
  // Each visible sheet is a real first-letter sample, capped at eight, never a fabricated total.
  for(let i=0;i<8;i++){
    letter('retry.paper'+i,-104+(i%2)*.3,39,54,17,44+i,'retry-'+i);
    letter('queue.paper'+i,-26+(i%2)*.3,39,58,17,44+i,'backlog-'+i);
  }
  topPlate('scale.base',86,-54,33,32,42,5);
  disc('scale.column',[102,-39,47],[0,0,1],0,20,5,'mid');
  disc('scale.neck',[102,-39,67],[0,0,1],0,2,7,'mid');
  topPlate('scale.pan',84,-57,37,37,69,3,'hi');
  box('scale.packet',90,-50,25,24,72,4,'hi','payload',L(k.planOutline({x:96,y:-50,w:3,d:24,r:0},76,P),{tone:'lo'}));
  disc('scale.dial.base',[102,-4,42],[0,0,1],0,7,16,'hi');
  const gaugeTop=49;
  const ticks=k.radialTicks(102,-4,13.5,40,5,gaugeTop,[1.4,3],P);
  const faceArt=L(k.ring(102,-4,14,gaugeTop,P,64),{tone:'mid'})+L(k.ring(102,-4,13.5,gaugeTop,P,64),{tone:'lo'})+L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'})+L(k.ring(102,-4,1.3,gaugeTop+.2,P,20),{tone:'hi'});
  const needle=`<path data-email="rider" class="iso-line" data-tone="hi" data-free="true" d="${k.lineOnTop([102,-4],[102,-15],gaugeTop+.2,P)}"/>`;
  R.items[R.items.length-1].svg+=faceArt+needle;
  box('chute.floor',79,23,40,37,42,3,'lo');
  box('chute.left',79,23,3,37,45,9);box('chute.right',116,23,3,37,45,9);
  for(const y of [27,36,45,54])box('chute.slip'+count,82,y,34,1,45,1,'lo');
  letter('envelope',-108,-12,22,20,53,'letter');
  // Moving envelope starts above the rollers. Its flap lives inside the same audited group.
  const gate={x:68,y:-25,w:5,d:49,r:1};
  put('gate',[70,-.5,58],k.slabOf(gate,53,10,P,4,.5),A.slab(gate,53,10,{name:'gate'},4),{tone:'hi',lit:true,live:'gate',inner:screws(gate,63)});
  // The stroke ruler is set into the near lip, with every tick rooted on its outline.
  const strip={x:-104,y:25.5,w:168,d:5,r:1};
  box('travel.ruler',strip.x,strip.y,strip.w,strip.d,42,.8,'lo','',L(k.planOutline(strip,42.8,P),{tone:'lo'}));
  const travelTicks=k.topTicks(-100,60,4,5,25.5,42.8,[1.6,3.2],P);
  const ruleArt=L(travelTicks.minor,{tone:'lo'})+L(travelTicks.major,{tone:'mid'});
  R.items[R.items.length-1].svg+=ruleArt;
  // Dispatch forms are an actual inset plate with printed rule lines, not floating labels.
  const form={x:47,y:38,w:23,d:26,r:1};
  const rules=[8,13,18].map((dy,i)=>L(k.lineOnTop([form.x+3,form.y+dy],[form.x+form.w-3-i*3,form.y+dy],43,P),{tone:'lo',free:true})).join('');
  topPlate('dispatch.form',form.x,form.y,form.w,form.d,42,1,'lo');
  R.items[R.items.length-1].svg+=rules;
  const movers=['retry','backlog','payload','letter','gate'];
  const endpoints=Array.from({length:32},(_,bits)=>({label:`independent travel endpoints ${bits}`,shares:Object.fromEntries(movers.map((ride,i)=>[ride,(bits>>i)&1]))}));
  const sweeps=[0,1].flatMap(rest=>movers.flatMap(ride=>Array.from({length:20},(_,i)=>({label:`${ride} travel ${(i+1)/20}; others ${rest}`,shares:{...Object.fromEntries(movers.map(name=>[name,rest])),[ride]:(i+1)/20}}))));
  const poses=[0,...endpoints,...sweeps,...Array.from({length:10},(_,i)=>(i+1)/10)];
  A.settle(R,P,{states:poses});R.items.sort((a,b)=>a.key-b.key);A.auditOrExit(R,P,{argv,frames:poses,apart:true});
  const items=R.items.map((item,i)=>({id:i,key:item.key,ride:item.ride,lift:G.dot3(item.move,G.viewOf(P))}));
  const body=`<g data-email-machine>${halo(base,-7,7)}<g data-email-parts>${R.items.map((item,i)=>`<g data-email-item="${i}"${/^(station|stamp)\./.test(item.name)?' data-email-worker style="cursor:pointer"':''}>${item.svg}</g>`).join('')}</g></g>`;
  return {markup:plate({id:23,body,role:'group',keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'}]}),data:{P,parts:count,items,gauge:{x:102,y:-4,z:49.2,r:11},letterCap:8}};
}
