import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as G from '../kit/lathe.mjs';
import * as T from '../kit/tube.mjs';
import * as A from '../kit/audit.mjs';

// A sloped telephone switchboard: one durable message, a recipient selector,
// and one plugged circuit for each device per user. Capacity is not user count.
export async function build({ argv }) {
  const base={x:-130,y:-85,w:260,d:205,r:8};
  const P=k.fitProjection([...k.boxCorners(base,-16,0),[-110,-75,108],[110,-75,108]],WIDTH,HEIGHT,{pad:42,azimuth:35,elevation:24});
  const {S,L,D,halo}=painter(P), R=A.recorder(P);
  let parts=0;
  const dot=(pts,size=0.5)=>D(k.pointsAt(pts,P),{size,tone:'mid'});
  function put(name,at,paths,shape,tone='mid',inner='',attrs='') {
    parts++;
    const moving=attrs==='data-slider';
    return R.put({name,at,piece:moving?'selector':'',move:moving?[128,0,0]:[0,0,0],svg:`<g ${attrs}>${S(paths,{tone,inner})}</g>`,shapes:[R.solid(shape)]});
  }
  function slab(name,p,z,h,tone='mid',inner='',attrs='') {
    return put(name,[p.x+p.w/2,p.y+p.d/2,z+h/2],k.slabOf(p,z,h,P,6,0.6),A.slab(p,z,h,{name,ground:name==='stand.base'},6),tone,inner,attrs);
  }
  function cyl(name,x,y,r,z,h,tone='mid',inner='',attrs='') {
    return put(name,[x,y,z+h/2],k.cylinder(x,y,r,z,h,P,48,0.4),A.cylinder(x,y,r,z,h,{name}),tone,inner,attrs);
  }
  function disc(name,F,a,b,r,tone='mid',inner='',attrs='') {
    return put(name,G.pointOf(F,(a+b)/2,0,0),G.disc(a,b,r,F,P),A.disc(F,a,b,r,{name}),tone,inner,attrs);
  }
  function prism(name,F,polygon,a,b,tone='mid',inner='',attrs='') {
    return put(name,G.pointOf(F,(a+b)/2,0,0),G.prismOf(F,polygon,a,b,P),A.prism(F,polygon,a,b,{name}),tone,inner,attrs);
  }
  function screws(plan,z,inset=4) {
    const corners=k.corners(plan,inset);
    return corners.map(([x,y])=>L(k.ring(x,y,1.8,z,P,24),{tone:'lo'})).join('')+dot(corners.map(([x,y])=>[x,y,z]),0.6);
  }
  for(const [i,[x,y]] of k.corners(base,18).entries()) {
    cyl(`foot.flange.${i}`,x,y,8,-16,4,'lo');cyl(`foot.pad.${i}`,x,y,6,-12,4,'lo');
  }
  slab('stand.base',base,-8,8,'lo',L(k.sideSeam(base,-4,P,6),{tone:'faint'}));
  const desk={x:-121,y:-77,w:242,d:189,r:5};
  slab('keyshelf',desk,0,8,'mid',L(k.planOutline(k.insetPlan(desk,4),8,P),{tone:'faint'})+screws(desk,8,9));

  // The wedge gives the recognisable leaning jack-panel silhouette.
  const XF=G.frameOf([0,0,0],[1,0,0],[0,1,0],[0,0,1]);
  const wedge=[[-75,8],[-75,105],[-15,40],[-15,8]];
  prism('sloped.cabinet',XF,wedge,-111,111,'mid');
  // Only the facing service cover is visible; never draw the far-side vents through the case.
  for(const x of [111]) {
    const edge=([y,z])=>k.iso([x,y,z],P);
    const cover=[[-68,17],[-68,86],[-22,36],[-22,17]];
    R.items[R.items.length-1].svg+=L(k.pathOf(cover.map(edge),true),{tone:'faint'});
    for(let j=0;j<7;j++) {
      const y=-61+j*5;
      const top=86-(y+1.4+68)*50/46-5;
      const slot=[[y,22],[y,top],[y+1.4,top],[y+1.4,22]];
      R.items[R.items.length-1].svg+=L(k.pathOf(slot.map(edge),true),{tone:'lo'});
    }
    R.items[R.items.length-1].svg+=dot(cover.map(([y,z])=>[x,y,z]),0.7);
  }
  // Three bolted service covers close the lower cabinet face.
  for(const [i,x,w] of [[0,-81,44],[1,0,98],[2,81,44]]) {
    const FF=G.frameOf([x,-15,24],[0,1,0],[1,0,0],[0,0,-1]);
    const polygon=[[-w/2,-10],[w/2,-10],[w/2,10],[-w/2,10]];
    prism(`circuit.cover.${i}`,FF,polygon,0,0.6,'mid');
    const face=(u,v)=>k.iso([x+u,-14.4,24-v],P);
    R.items[R.items.length-1].svg+=L(k.pathOf([[-w/2+4,-6],[w/2-4,-6],[w/2-4,6],[-w/2+4,6]].map(([u,v])=>face(u,v)),true),{tone:'faint'});
    R.items[R.items.length-1].svg+=L(k.pathOf([[-5,-1],[5,-1],[5,1],[-5,1]].map(([u,v])=>face(u,v)),true),{tone:'lo'});
    R.items[R.items.length-1].svg+=D([face(-w/2+3,-7),face(w/2-3,-7),face(-w/2+3,7),face(w/2-3,7)],{size:0.5,tone:'mid'});
  }
  const N=G.unit3([0,65,60]), U=[1,0,0], V=G.unit3([0,60,-65]);
  const panel=G.frameOf([0,-45,72.5],N,U,V);
  const rect=(w,h)=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  prism('jack.panel',panel,rect(212,76),0,1.2,'hi');
  const outline=(w,h,s)=>k.pathOf(rect(w,h).map(([u,v])=>k.iso(G.add3(G.pointOf(panel,s,0,0),G.add3(G.mul3(U,u),G.mul3(V,v))),P)),true);
  R.items[R.items.length-1].svg+=L(outline(204,68,1.2),{tone:'faint'});
  const jack=[], sockets=[], cords=[], keys=[];
  for(let i=0;i<4;i++) {
    const x=-81+i*54;
    const F=G.frameOf([x,-45,72.5],N,U,V);
    const attrs=`data-device="${i}"`;
    prism(`jack.plate.${i}`,F,rect(40,55),1.2,2.4,'mid');
    const boltPts=[];
    for(const u of [-16,16])for(const v of [-23,23])boltPts.push(G.add3(G.pointOf(F,2.4,0,0),G.add3(G.mul3(U,u),G.mul3(V,v))));
    R.items[R.items.length-1].svg+=dot(boltPts,0.6);
    disc(`socket.rim.${i}`,F,2.4,5,8,'hi',L(G.circleOf(F,5,5.8,P),{tone:'lo'}));
    disc(`socket.well.${i}`,F,5,5.4,4.7,'lo');
    disc(`plug.shaft.${i}`,F,5.4,12,3.5,'hi','',attrs);
    disc(`plug.grip.${i}`,F,12,20,5.5,'hi',k.fadedSvg(G.ribsOf(F,12,20,5.5,30,P,{fade:[0.04,0.5],seams:true}),{tone:'lo'}),attrs);
    disc(`plug.ferrule.${i}`,F,20,23,3.2,'mid','',attrs);
    const LF=G.frameOf(G.add3(F.o,G.mul3(V,-17)),N,U,V);
    disc(`supervision.lamp.${i}`,LF,2.4,5.5,4.2,'mid',L(G.circleOf(LF,5.5,2.7,P),{tone:'lo'}));
    jack.push(k.iso(G.pointOf(LF,5.6,0,0),P));
    sockets.push(k.iso(G.pointOf(F,12,0,0),P));

    // One physically plugged cord circuit per device; inactive capacity is hidden.
    const start=G.pointOf(F,23,0,0), end=[x,39,21];
    const route=G.fillet([start,G.add3(start,G.mul3(N,17)),[x,19,57],[x,39,35],end],7,12,{P,tube:1.15});
    const radius=1.15, name=`cord.${i}`;
    R.route(name,route,radius,{limp:true,owner:name});
    const chunks=T.tubePieces(route,radius,P,{maxLength:12,spacing:1.5,rings:{pitch:4,fade:[0.05,0.5]}});
    for(const [j,chunk] of chunks.entries()) R.put({name:`${name}.${j}`,route:name,chunk:j,at:chunk.mid,svg:`<g ${attrs}>${T.tubeSvg(chunk,{tone:'mid'})}</g>`,shapes:[A.tube(chunk.points,chunk.radii,{name:`${name}.shape.${j}`})]});
    parts++;
    cords.push(G.resample(route,1.5).map(p=>k.iso(p,P)));
    const kp={x:x-18,y:32,w:36,d:22,r:2};
    slab(`keyplate.${i}`,kp,8,2,'mid',screws(kp,10,4));
    cyl(`key.socket.${i}`,x,39,4.8,10,3,'hi',L(k.ring(x,39,3.5,13,P,32),{tone:'lo'}));
    cyl(`key.shell.${i}`,x,39,3.5,13,8,'hi','',attrs);
    const button={x:x-11,y:45,w:22,d:6,r:1};
    slab(`key.${i}`,button,10,3,'hi',L(k.planOutline(k.insetPlan(button,1.2),13,P),{tone:'faint'}));
    keys.push(k.iso([x,48,13.1],P));
  }

  // Recipient range is an actual slider on a ruler with both end stops and bushings.
  const rail={x:-111,y:66,w:151,d:15,r:1.5};
  slab('recipient.rail',rail,8,2,'mid');
  const ticks=k.topTicks(-103,31,4,5,67,10,[1.7,3.2],P);
  R.items[R.items.length-1].svg+=L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'});
  for(const x of [-110,34]) slab(`recipient.stop.${x}`,{x,y:69,w:5,d:10,r:1},10,4,'mid',dot([[x+2.5,74,14]],0.65));
  slab('recipient.runner',{x:-104,y:70,w:10,d:10,r:1},10,3,'hi','', 'data-slider');
  slab('recipient.handle',{x:-102,y:72,w:6,d:6,r:1},13,4,'hi','', 'data-slider');

  // Inbox is a slotted card tray, not a socket: references survive offline delivery.
  slab('inbox.floor',{x:-111,y:89,w:151,d:18,r:2},8,1.5,'mid');
  for(const [name,p] of [['back',{x:-111,y:89,w:151,d:2,r:0.5}],['left',{x:-111,y:91,w:2,d:14,r:0.5}],['right',{x:38,y:91,w:2,d:14,r:0.5}],['front',{x:-111,y:105,w:151,d:2,r:0.5}]])slab(`inbox.${name}`,p,9.5,5,'mid');
  const card={x:-104,y:94,w:135,d:8,r:0.8};
  slab('message.card',card,9.5,1,'hi',L(k.planOutline(k.insetPlan(card,1),10.5,P),{tone:'faint'}));
  R.items[R.items.length-1].svg+=L(k.lineOnTop([-99,97],[-28,97],10.5,P),{tone:'lo',free:true})+L(k.lineOnTop([-99,99],[17,99],10.5,P),{tone:'lo',free:true});

  // Presence regulator: one revolution is exactly the selected heartbeat interval.
  const tm={x:54,y:67,w:53,d:40,r:3};
  slab('timer.mount',tm,8,2,'mid',screws(tm,10,4));
  cyl('timer.case',80,87,17,10,8,'hi',L(k.sideArc(80,87,17,15,P,48),{tone:'faint'}));
  cyl('timer.face',80,87,15.3,18,0.6,'hi',L(k.ring(80,87,14.2,18.6,P,64),{tone:'lo'}));
  const dialTicks=k.radialTicks(80,87,14,24,6,18.6,[1.2,2.5],P);
  R.items[R.items.length-1].svg+=L(dialTicks.minor,{tone:'lo'})+L(dialTicks.major,{tone:'mid'});
  cyl('timer.hub',80,87,1.8,18.6,0.8,'mid');
  // The compact inbox meter bolts directly to the cabinet's right side.
  // Its rear face is flush with the cabinet; no poles or floating display plane.
  const register=G.frameOf([111,-45,30],[1,0,0],[0,-1,0],[0,0,-1]);
  prism('inbox.counter.case',register,rect(58,18),0,6,'mid');
  prism('inbox.counter.bezel',register,rect(58,18),6,8,'hi');
  const face=(u,v)=>k.iso(G.add3(G.pointOf(register,8,0,0),G.add3(G.mul3(register.u,u),G.mul3(register.v,v))),P);
  const screen=rect(54,12).map(([u,v])=>face(u,v));
  R.items[R.items.length-1].svg+=L(k.pathOf(screen,true),{tone:'lo'})+D([face(-27,-7),face(27,-7),face(-27,7),face(27,7)],{size:0.55,tone:'mid'});
  const o=face(0,0),u=face(1,0),v=face(0,1);
  const matrix=`matrix(${u[0]-o[0]} ${u[1]-o[1]} ${v[0]-o[0]} ${v[1]-o[1]} ${o[0]} ${o[1]})`;
  R.items[R.items.length-1].svg+=`<g transform="${matrix}"><clipPath id="c12-inbox-display"><rect x="-27" y="-6" width="54" height="12"/></clipPath><text data-inbox-count clip-path="url(#c12-inbox-display)" x="0" y="3.2" text-anchor="middle" font-family="monospace" font-size="9.5" fill="var(--anatomy-hi)"></text></g>`;

  // Every allowed recipient setting and the midpoint of each eased transition.
  const poses=Array.from({length:197},(_,i)=>i/196);
  A.settle(R,P,{states:poses});A.auditOrExit(R,P,{argv,frames:poses,apart:true});
  const footprints=[...R.solids,...R.tubes].map(shape=>A.footprintOf(shape,A.cameraBasis(P)));
  const bounds=[Math.min(...footprints.map(b=>b[0])),Math.min(...footprints.map(b=>b[1])),Math.max(...footprints.map(b=>b[2])),Math.max(...footprints.map(b=>b[3]))];
  const timer=[80,87,19.5], inbox=G.pointOf(register,8,0,0), inboxSignal=G.add3(G.add3(inbox,G.mul3(register.u,-27)),G.mul3(register.v,-7)), hub=k.iso(timer,P);
  const layer=R.items.sort((a,b)=>a.key-b.key).map(item=>`<g data-machine-piece data-depth="${item.key}" data-lift="${G.dot3(item.move,G.viewOf(P))}">${item.svg}</g>`).join('');
  const body=halo(base,-16,12)+`<g data-machine-layer>${layer}</g>`+`<path data-needle class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([80,87],[80,75],19.5,P)}"/>`+D([hub],{size:1.5,tone:'mid'})+`<circle data-signal cx="${hub[0]}" cy="${hub[1]}" r="2.2" fill="var(--anatomy-lit)"/>`;
  return {markup:plate({id:12,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'edge',key:'key.1'},{mark:'lit',key:'key.2'}]}),data:{P,jack,sockets,cords,keys,timer,inbox,inboxSignal,sliderTravel:128,parts,bounds}};
}
