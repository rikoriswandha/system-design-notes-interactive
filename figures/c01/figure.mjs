import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';
import * as T from '../kit/tube.mjs';

// Figure: a sectional hydraulic manifold, eight removable metering pumps,
// a cache bypass pot, a fixed database restrictor, and an overflow meter.
export async function build({ audit, argv }) {
  const base = { x: -150, y: -82, w: 330, d: 164, r: 8 };
  const P = k.fitProjection([...k.boxCorners(base, -16, 0), [-123,-61,113], [-39,34,87], [67,34,87]], WIDTH, HEIGHT, {pad: 43, azimuth: 57, elevation: 36});
  P.origin[1] += 6;
  const {S,L,D,at,halo} = painter(P);
  const R = A.recorder(P);
  let count = 0;
  function put(name, center, svg, shape, attrs = '', metadata = {}) {
    count++;
    R.put({name, piece:'bench', at:center, svg:`<g ${attrs}>${svg}</g>`, shapes:[R.solid(shape)], ...metadata});
  }
  function box(name, plan, z, h, tone='mid', inner='', attrs='') {
    put(name,[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],S(k.slabOf(plan,z,h,P,6,.7),{tone,inner}),A.slab(plan,z,h,{name,owner:'bench'},6),attrs);
  }
  function cyl(name,x,y,r,z,h,tone='mid',inner='',attrs='') {
    put(name,[x,y,z+h/2],S(k.cylinder(x,y,r,z,h,P,48,.5),{tone,inner}),A.cylinder(x,y,r,z,h,{name,owner:'bench'}),attrs);
  }
  function sight(name,x,y,from,to,attrs='') {
    const plan={x:x-4.2,y,w:8.4,d:1.5,r:.5};
    const face=k.sideMatrix([x,y+1.5],0,P,'left');
    const clip=`c01-sight-${name}`;
    const screws=D(k.pointsAt([[x-2.8,y+1.5,from+2],[x+2.8,y+1.5,to-2]],P),{size:.42});
    const window=`<g transform="${face}"><defs><clipPath id="${clip}"><rect x="-2.8" y="${-to+4}" width="5.6" height="${to-from-8}" rx="1"/></clipPath></defs><rect x="-2.8" y="${-to+4}" width="5.6" height="${to-from-8}" rx="1" fill="var(--anatomy-shade-1)" stroke="var(--anatomy-lo)" stroke-width=".45"/><g clip-path="url(#${clip})"><rect data-level="${name}" x="-2.8" y="${-from-10}" width="5.6" height="6" rx=".3" fill="var(--anatomy-top)" stroke="var(--anatomy-hi)" stroke-width=".6"/></g></g>`;
    const rules=[];
    for(let z=from+6;z<to-4;z+=4)rules.push(k.segment([x+2.8,y+1.5,z],[x+4.2,y+1.5,z],P));
    box(`${name}.sight`,plan,from,to-from,'mid',window+screws+L(rules.join(''),{tone:'lo'}),attrs);
    return {name,travel:to-from-14,from:from+4,to:to-4};
  }
  const levels=[];
  for (const [i,[x,y]] of k.corners(base,20).entries()) {
    cyl(`stand.foot${i}`,x,y,7,-16,3,'lo');
    cyl(`stand.pad${i}`,x,y,5,-13,3,'lo');
  }
  const screwRings=k.corners(base,10).map(([x,y])=>k.ring(x,y,1.8,0,P,24)).join('');
  box('stand.deck',base,-10,10,'lo',L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+L(screwRings,{tone:'lo'})+D(k.corners(base,10).map(([x,y])=>at([x,y,0])),{size:.55}));
  // The raised channels are machined closed ducts; each cap seam wraps its corners.
  const duct = (name,x,y,w,d) => {
    const plan={x,y,w,d,r:1};
    const topDetail=L(k.planOutline(k.insetPlan(plan,1.5),9,P,6),{tone:'faint'});
    box(name,plan,0,9,'mid',L(k.sideSeam(plan,6,P,6),{tone:'faint'})+topDetail+D(k.corners(plan,2).map(([x,y])=>at([x,y,9])),{size:.4}));
  };
  duct('inlet',-135,-66,255,10);
  duct('collector',-135,-8,255,10);
  const pumps=[];
  for(let i=0;i<8;i++) {
    const x=-119+i*30, y=-32;
    const attrs=`data-pump="${i}"`;
    duct(`branch${i}`,x-4,-56,8,48);
    for(const yPort of [-51,-13]){
      cyl(`socket${i}.${yPort}`,x,yPort,2.8,9,2,'mid',L(k.ring(x,yPort,1.9,11,P,24),{tone:'faint'})+D([at([x,yPort,11])],{size:.45}));
    }
    cyl(`pump${i}.foot`,x,y,14,9,3,'mid','',attrs);
    cyl(`pump${i}.gland`,x,y,11,12,3,'mid',L(k.ring(x,y,8.5,15,P,48),{tone:'faint'}),attrs);
    cyl(`pump${i}.lowerbarrel`,x,y,8,15,7,'hi','',attrs);
    cyl(`pump${i}.lowerstrap`,x,y,10,22,2,'mid','',attrs);
    cyl(`pump${i}.body`,x,y,8,24,32,'hi',L(k.sideArc(x,y,8,40,P,32),{tone:'faint'}),attrs);
    cyl(`pump${i}.upperstrap`,x,y,10,56,2,'mid','',attrs);
    cyl(`pump${i}.upperbarrel`,x,y,8,58,7,'hi','',attrs);
    levels.push(sight(`pump${i}`,x,y+10,22,58,attrs));
    for(const side of [-1,1]) {
      cyl(`pump${i}.tie${side}`,x+side*13,y,1.2,15,50,'mid','',attrs);
      cyl(`pump${i}.washer${side}`,x+side*13,y,1.8,12,3,'mid','',attrs);
    }
    cyl(`pump${i}.orifice`,x,y,14,65,3,'mid',D(k.circleRing(x,y,11.5,8).map(([x,y])=>at([x,y,68])),{size:.45}),attrs);
    cyl(`pump${i}.valveneck`,x,y,3,68,4,'mid','',attrs);
    cyl(`pump${i}.valve`,x,y,5,72,4,'hi',L(k.knurl(x,y,5,72,76,24,P),{tone:'lo'}),attrs);
    const p=at([x,y,76.2]);
    pumps.push({x,y,z:76.2, center:p});
  }
  duct('return',-135,2,10,57);
  duct('delivery',-125,49,245,10);
  duct('cachefeed',-44,2,10,19);
  duct('databasefeed',62,2,10,19);
  const gauges=[];
  function vessel(name,x,y,r) {
    const foot={x:x-r-3,y:y-r-3,w:2*r+6,d:2*r+6,r:2};
    box(`${name}.foot`,foot,0,4,'mid',L(k.planOutline(k.insetPlan(foot,2),4,P,6),{tone:'faint'})+D(k.corners(foot,3).map(([x,y])=>at([x,y,4])),{size:.45}));
    cyl(`${name}.lower`,x,y,r,4,15,'hi','');
    cyl(`${name}.lowerstrap`,x,y,r+2,19,3,'mid','');
    cyl(`${name}.tank`,x,y,r,22,38,'hi',L(k.sideArc(x,y,r,40,P,32),{tone:'faint'}));
    cyl(`${name}.upperstrap`,x,y,r+2,60,3,'mid','');
    cyl(`${name}.upper`,x,y,r,63,9,'hi','');
    levels.push(sight(name,x,y+r+2,19,63));
    cyl(`${name}.lid`,x,y,r+1,72,3,'mid',D(k.circleRing(x,y,r-3,10).map(([x,y])=>at([x,y,75])),{size:.45}));
  }
  vessel('cache',-39,34,10);
  vessel('database',67,34,10);
  // Each dial is mounted directly on its duct or tank, rather than floating.
  function gauge(name,x,y,z,r) {
    cyl(`${name}.socket`,x,y,5,z,4,'mid');
    const top=z+11;
    const ticks=k.radialTicks(x,y,r-3,24,4,top,[1.3,2.5],P,-Math.PI*.75,Math.PI*1.5);
    const rest=k.lineOnTop([x,y],[x-5,y+5],top+.2,P);
    const inner=L(k.ring(x,y,r-3,top,P,64),{tone:'lo'})+L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'})+`<path data-needle="${name}" class="iso-line" data-tone="hi" data-free="" d="${rest}"/>`+D([at([x,y,top+.3])],{size:1,tone:'mid'});
    cyl(`${name}.dial`,x,y,r,z+4,7,'hi',inner,`data-meter="${name}"`);
    gauges.push({name,x,y,z:top+.2,r:r-5});
  }
  cyl('incoming.mastfoot',-123,-61,9,9,4,'mid');
  cyl('incoming.mast',-123,-61,3.5,13,80,'mid',L(k.sideArc(-123,-61,3.5,65,P,32),{tone:'faint'}));
  gauge('incoming',-123,-61,93,20);
  gauge('cache',-39,34,75,17);
  gauge('database',67,34,75,17);
  gauge('overflow',126,54,0,17);
  const regulator={x:-105,y:13,w:28,d:22,r:2};
  box('cache.regulator',regulator,0,8,'mid',L(k.sideSeam(regulator,5,P,6),{tone:'faint'})+D(k.corners(regulator,3).map(([x,y])=>at([x,y,8])),{size:.45}),'data-cache-knob');
  box('cache.control-link',{x:-77,y:23,w:25,d:6,r:0},0,4,'mid',L(k.sideSeam({x:-77,y:23,w:25,d:6,r:0},2,P,6),{tone:'faint'}));
  cyl('cache.control-neck',-91,24,4,8,3,'mid','','data-cache-knob');
  const wheelTicks=k.radialTicks(-91,24,7,20,4,15,[1,1.8],P,-Math.PI*.75,Math.PI*1.5);
  const wheel=L(k.knurl(-91,24,9,11,15,40,P),{tone:'lo'})+L(k.ring(-91,24,7,15,P,48),{tone:'lo'})+L(wheelTicks.minor,{tone:'lo'})+L(wheelTicks.major,{tone:'mid'})+`<path class="iso-line" data-cache-pointer data-tone="hi" data-free="" d="${k.lineOnTop([-91,24],[-96,29],15.2,P)}"/>`+D([at([-91,24,15.3])],{size:.6});
  cyl('cache.control-wheel',-91,24,9,11,4,'hi',wheel,'data-cache-knob');
  // A separate drain fitting leaves the collector, beside the delivery duct.
  duct('overflowdrain',120,-8,10,45);
  duct('collector.end',130,-8,48,10);
  const ruler={x:-112,y:67,w:220,d:5,r:.8};
  const ticks=k.topTicks(-108,104,4,5,67,.8,[1.7,3.2],P);
  box('stand.ruler',ruler,0,.8,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
  const nameplate={x:-143,y:62,w:25,d:12,r:1};
  const rules=[[-138,-123,65],[-138,-127,68],[-138,-130,71]].map(([a,b,y])=>k.lineOnTop([a,y],[b,y],.8,P)).join('');
  const plateScrews=[[-140,64],[-121,72]];
  box('stand.nameplate',nameplate,0,.8,'mid',L(k.planOutline(k.insetPlan(nameplate,1),.8,P,6),{tone:'faint'})+L(rules,{tone:'lo',free:true})+L(plateScrews.map(([x,y])=>k.ring(x,y,1,.8,P,16)).join(''),{tone:'lo'})+D(plateScrews.map(([x,y])=>at([x,y,.8])),{size:.35}));
  const hatch={x:148,y:40,w:22,d:29,r:2};
  const vents=Array.from({length:5},(_,i)=>k.planOutline({x:153,y:45+i*3.8,w:12,d:1.2,r:.6},.8,P,4)).join('');
  const hatchCorners=k.corners(hatch,3);
  box('stand.service-hatch',hatch,0,.8,'mid',L(k.planOutline(k.insetPlan(hatch,1.5),.8,P,6),{tone:'faint'})+L(vents,{tone:'lo'})+L(hatchCorners.map(([x,y])=>k.ring(x,y,1.2,.8,P,20)).join(''),{tone:'lo'})+D(hatchCorners.map(([x,y])=>at([x,y,.8])),{size:.4}));
  function fitting(name,point,axis,length=2,radius=2) {
    const F=G.frameAlong(point,axis);
    put(name,G.pointOf(F,length/2,0,0),S(G.disc(0,length,radius,F,P),{tone:'mid',inner:L(G.circleOf(F,length,radius*.65,P),{tone:'faint'})}),A.disc(F,0,length,radius,{name,owner:name}));
  }
  function hardline(name,points) {
    const radius=1.2, ballRadius=2, seat=Math.sqrt(ballRadius**2-radius**2);
    points.slice(1,-1).forEach((point,i)=>{
      const id=`${name}.elbow${i}`;
      put(id,point,S(G.sphereOf(point,ballRadius,P),{tone:'mid'}),A.ball(point,ballRadius,{name:id,owner:id}));
    });
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],axis=G.unit3(G.sub3(b,a));
      const line=[i?G.add3(a,G.mul3(axis,seat)):a,i<points.length-2?G.sub3(b,G.mul3(axis,seat)):b];
      const id=`${name}.run${i}`;
      R.route(id,line,radius,{owner:id,piece:'bench'});
      T.tubePieces(line,radius,P,{maxLength:12}).forEach((piece,j)=>{
        put(`${id}:${j}`,piece.mid,T.tubeSvg(piece,{tone:'mid'}),A.tube(piece.points,piece.radii,{name:`${id}:${j}`,owner:id}),'',{route:id,chunk:j});
      });
    }
  }
  // Two physically separate branches: cache hits return to delivery; misses
  // travel from the collector into the database's fixed restrictor.
  fitting('cache.return-port',[-26,34,2],[1,0,0]);
  fitting('cache.delivery-port',[14,54,9],[0,0,1],6);
  hardline('cache.bypass',[[-24,34,2],[-6,34,2],[-6,34,24],[14,34,24],[14,54,24],[14,54,15]]);
  fitting('database.miss-port',[80,34,2],[1,0,0]);
  fitting('database.collector-port',[172,-3,9],[0,0,1],6);
  hardline('database.misses',[[82,34,2],[96,34,2],[96,34,50],[115,34,50],[115,34,65],[172,34,65],[172,-3,65],[172,-3,15]]);
  A.settle(R,P);
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv:audit?['--audit']:argv});
  const body=halo(base,-16,10)+R.items.map(i=>i.svg).join('');
  return {markup:plate({id:1,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'edge',key:'key.1'},{mark:'lit',key:'key.2'}],controls:'<div class="iso-controls"><button class="btn" data-action="add" data-fig-text="fig.c01.add"></button><button class="btn" data-action="cache" data-fig-text="fig.c01.cacheButton"></button><button class="btn" data-action="failure" data-fig-text="fig.c01.failure"></button></div>'}),data:{P,gauges,pumps,levels,parts:count}};
}
