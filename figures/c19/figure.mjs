import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// Gated lanes are partitions; each consumer owns one capping spindle.
// Bottles are illustrative batches, one per open lane, never literal event counts.
export async function build({ audit, argv }) {
  const base={x:-163,y:-78,w:326,d:174,r:7};
  const P=k.fitProjection([...k.boxCorners(base,-14,0),...k.boxCorners({x:-157,y:-5,w:314,d:10,r:2},71,88),...k.boxCorners({x:-148,y:-76,w:296,d:27,r:2},57,60)],WIDTH,HEIGHT,{pad:38,azimuth:42,elevation:32});
  const {S,L,D,at,halo}=painter(P);
  const R=A.recorder(P);
  let count=0;
  function put(name,center,svg,shape,attrs='') {
    count++;
    R.put({name,piece:'stand.frame',at:center,svg:`<g ${attrs}>${svg}</g>`,shapes:[R.solid(shape)]});
  }
  function box(name,plan,z,h,tone='mid',inner='',attrs='',lit=false) {
    put(name,[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],S(k.slabOf(plan,z,h,P,4,.5),{tone,lit,inner}),A.slab(plan,z,h,{name,owner:'stand.frame'}),attrs);
  }
  function round(name,x,y,r,z,h,tone='mid',inner='',attrs='') {
    put(name,[x,y,z+h/2],S(k.cylinder(x,y,r,z,h,P,32,.35),{tone,inner}),A.cylinder(x,y,r,z,h,{name,owner:'stand.frame'}),attrs);
  }
  function screws(plan,z,inset=2) {
    const pts=k.corners(plan,inset);
    return L(pts.map(([x,y])=>k.ring(x,y,1.1,z,P,16)).join(''),{tone:'lo'})+D(pts.map(([x,y])=>at([x,y,z])),{size:.4});
  }
  for(const [x,y] of k.corners(base,17)) {
    round(`stand.footflange.${x}.${y}`,x,y,6,-14,2,'lo');
    round(`stand.foot.${x}.${y}`,x,y,4.8,-12,4,'lo',L(k.sideArc(x,y,4.8,-10,P,24),{tone:'faint'}));
  }
  box('stand.base',base,-8,8,'lo',L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+L(k.sideSeam(base,-3,P,4),{tone:'faint'})+screws(base,0,10)+D([-125,-75,-25,25,75,125].map(x=>at([x,96,-5])),{size:.4,tone:'lo'}));
  const bed={x:-148,y:-28,w:296,d:96,r:3};
  box('stand.bed',bed,0,8,'lo',L(k.sideSeam(bed,4,P,4),{tone:'faint'}));
  for(let i=0;i<24;i++) {
    const x=-144+i*12;
    const lane={x,y:-28,w:10,d:96,r:1};
    const groove=L(k.planOutline(k.insetPlan(lane,1.4),10,P),{tone:'faint'});
    const ribs=Array.from({length:14},(_,j)=>L(k.lineOnTop([x+1.4,-24+j*6],[x+8.6,-24+j*6],10,P),{tone:'faint'})).join('');
    box(`stand.lane.${i}`,lane,8,2,'mid',groove+ribs,`data-lane="${i}"`);
    box(`stand.gate.${i}`,{x,y:14,w:10,d:3,r:.5},10,12,'hi',D([at([x+2,15.5,22]),at([x+8,15.5,22])],{size:.4}),`data-gate="${i}"`);
    // A fluted bottle body, its shoulder collar, neck and screw cap.
    const attrs=`data-bottle="${i}"`;
    round(`stand.bottle.${i}.body`,x+5,0,3.9,10,22,'hi',L(k.sideArc(x+5,0,3.9,14,P,24),{tone:'faint'})+L(k.sideArc(x+5,0,3.9,29,P,24),{tone:'faint'}),attrs);
    round(`stand.bottle.${i}.shoulder`,x+5,0,3.9,32,3,'hi','',attrs);
    round(`stand.bottle.${i}.neck`,x+5,0,2,35,5,'hi','',attrs);
    round(`stand.bottle.${i}.cap`,x+5,0,2.6,40,3,'mid',L(k.knurl(x+5,0,2.6,40,43,18,P,0),{tone:'lo'}),attrs);
  }
  const rack={x:-148,y:-62,w:296,d:13,r:2};
  for(const x of [-146,138]) {
    box(`stand.rackleg.${x}`,{x,y:-60,w:8,d:9,r:1},0,40,'mid',L(k.sideSeam({x,y:-60,w:8,d:9,r:1},5,P,4),{tone:'faint'}));
  }
  box('stand.rack',rack,40,3,'lo',screws(rack,43,3));
  for(let i=0;i<24;i++) {
    const x=-139+i*12;
    box(`stand.parkseat.${i}`,{x:x-4,y:-59,w:8,d:8,r:1},43,.5,'lo',L(k.ring(x,-55,2.6,43.5,P,24),{tone:'faint'}));
  }
  for(const x of [-157,151]) {
    const foot={x:x-2,y:-9,w:10,d:18,r:2};
    box(`stand.postfoot.${x}`,foot,0,5,'lo',screws(foot,5,2));
    const post={x,y:-5,w:6,d:10,r:1};
    box(`stand.post.${x}`,post,5,66,'mid',L(k.sideSeam(post,15,P,4),{tone:'faint'})+L(k.sideSeam(post,62,P,4),{tone:'faint'}));
  }
  const beam={x:-157,y:-5,w:314,d:10,r:2};
  box('stand.beam',beam,71,8,'mid',L(k.sideSeam(beam,75,P,4),{tone:'faint'})+screws(beam,79,3)+D(Array.from({length:24},(_,i)=>at([-139+i*12,3,79])),{size:.4,tone:'lo'}));
  const travelTicks=k.topTicks(-139,137,12,4,-3,79.8,[1,2],P);
  box('stand.gantrytrack',{x:-147,y:-3,w:294,d:3,r:.6},79,.8,'lo',L(k.planOutline({x:-145,y:-2.4,w:290,d:1.8,r:.3},79.8,P),{tone:'faint'})+L(travelTicks.minor,{tone:'lo'})+L(travelTicks.major,{tone:'mid'}));
  for(const x of [-151,151]) {
    round(`stand.tensionknob.${x}`,x,0,3.8,79,6,'mid',L(k.knurl(x,0,3.8,79,85,24,P,0),{tone:'lo'})+L(k.lineOnTop([x,0],[x+3.8,0],85,P),{tone:'hi'})+D([at([x,0,85])],{size:.45}));
  }
  for(let i=0;i<24;i++) {
    const x=-144+i*12;
    const attrs=`data-head="${i}"`;
    round(`stand.head.${i}.tool`,x+5,0,3.1,43,4,'hi',L(k.knurl(x+5,0,3.1,43,47,20,P,0),{tone:'lo'}),`${attrs} data-stroke`);
    const F=G.frameAlong([x+5,0,57],[0,0,-1]);
    const rod=G.rodOut(F,0,10,1.4,P,{stroke:5});
    const clip=`c19-spindle-${i}`;
    put(`stand.head.${i}.spindle`,[x+5,0,52],`<defs><clipPath id="${clip}"><path data-hold d="${rod.clip}"/></clipPath></defs><g clip-path="url(#${clip})">${S(rod.paths,{tone:'mid'})}</g>`,A.slide(F,0,10,1.4,{name:`stand.head.${i}.spindle`,owner:'stand.frame'}),`${attrs} data-stroke data-spindle`);
    const motor={x:x+1,y:-5,w:8,d:10,r:1};
    const vents=Array.from({length:3},(_,j)=>L(k.planOutline({x:x+2.5+j*1.6,y:-2,w:.7,d:4,r:.3},71,P),{tone:'lo'})).join('');
    box(`stand.head.${i}.motor`,motor,57,14,'hi',L(k.sideSeam(motor,60,P,4),{tone:'faint'})+vents+D([at([x+3,-3,71]),at([x+7,3,71])],{size:.4}),attrs);
  }
  const tray={x:-134,y:74,w:126,d:16,r:2};
  box('stand.accumulator',tray,0,6,'lo',L(k.planOutline({x:-131,y:77,w:120,d:10,r:1},6,P),{tone:'faint'})+screws(tray,6,2));
  const ruler={x:-130,y:74.3,w:118,d:3,r:.6};
  const ticks=k.topTicks(-128,-14,4,5,74.3,6.6,[1.1,2.3],P);
  box('stand.ruler',ruler,6,.6,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
  box('stand.follower',{x:-129,y:78,w:9,d:10,r:1},6,12,'hi',screws({x:-129,y:78,w:9,d:10,r:1},18,2),'data-follower',true);
  for(const x of [-134,-12])box(`stand.stop.${x}`,{x,y:77,w:4,d:10,r:1},6,5,'mid',D([at([x+2,82,11])],{size:.45}));
  // An identification plate with printed rules, not an invented model readout.
  const badge={x:22,y:-75,w:46,d:12,r:1};
  const rules=[26,37,49].map((x,j)=>L(k.lineOnTop([26,-72+j*3],[x+12,-72+j*3],.8,P),{tone:'lo',free:true})).join('');
  box('stand.badge',badge,0,.8,'lo',L(k.planOutline(k.insetPlan(badge,1.4),.8,P),{tone:'faint'})+rules+D([at([24,-69,.8]),at([66,-69,.8])],{size:.4}));
  const displays=[['input',-128,-76,66,14],['capacity',-53,-76,66,14],['backlog',75,70,69,24],['drain',0,70,69,24]];
  for(const [name,x,y,w,d] of displays) {
    const top=name==='input'||name==='capacity'?60:9;
    const casePlan={x,y,w,d,r:2};
    let inner=L(k.sideSeam(casePlan,top-3,P,4),{tone:'faint'})+screws(casePlan,top,1.5);
    if(top>10) {
      // Front-face cooling slots are closed paths in the actual cabinet plane.
      inner= L(k.sideSeam(casePlan,top-3,P,4),{tone:'faint'})+screws(casePlan,top,1.5)+Array.from({length:8},(_,j)=>{
        const points=k.roundedPlan({x:x+5+j*7,y:18,w:2,d:20,r:.8},4).map(([a,z])=>at([a,y+d,z]));
        return L(k.pathOf(points,true),{tone:'faint'});
      }).join('');
    }
    box(`stand.counter.${name}`,casePlan,0,top,'mid',inner);
    const window={x:x+3,y:y+2,w:w-6,d:d-4,r:1};
    const clip=`c19-${name}-clip`;
    const svg=`<defs><clipPath id="${clip}"><path d="${k.planOutline(window,top,P)}"/></clipPath></defs>${L(k.planOutline(window,top,P),{tone:'lo'})}<g clip-path="url(#${clip})"><g transform="${k.topMatrix([x+w/2,y+d/2+2],top,P)}"><text class="iso-face-text" data-tone="hi" data-counter="${name}" text-anchor="middle" font-size="8.5"></text></g></g>`;
    R.items.find(it=>it.name===`stand.counter.${name}`).svg+=svg;
  }
  A.settle(R,P);
  if(audit)A.auditOrExit(R,P,{argv});
  const body=halo(base,-14,9)+`<g data-machine>${R.items.sort((a,b)=>a.key-b.key).map(it=>it.svg).join('')}</g>`;
  return {markup:plate({id:19,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'dim',key:'key.1'},{mark:'lit',key:'key.2'}]}),data:{P,parts:count}};
}
