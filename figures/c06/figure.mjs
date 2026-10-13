import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as G from '../kit/lathe.mjs';
import * as A from '../kit/audit.mjs';

// A door viewed from its exposed mechanism side: quorum bolts enter the jamb,
// while replacement keys remain visibly outside the original replica door.
export async function build({ audit, argv }) {
  const base={x:-118,y:-36,w:352,d:104,r:7};
  const P=k.fitProjection([...k.boxCorners(base,-14,0),[-112,0,216],[112,40,216],[230,38,190]],WIDTH,HEIGHT,{pad:44,azimuth:75,elevation:24});
  const {S,L,D,at,halo}=painter(P),R=A.recorder(P);
  let count=0;
  const front=(x,z,y=30)=>[x,y,z];
  const plane=(x,z,y=30)=>G.frameOf([x,y,z],[0,1,0],[1,0,0],[0,0,-1]);
  function put(name,point,svg,shape,attrs='') {
    const piece=name==='bolt.slider0'?'read':name==='bolt.slider1'?'write':name.startsWith('overlap.link')?'overlap':'vault';
    const move=piece==='read'||piece==='write'?[-24,0,0]:piece==='overlap'?[0,8,0]:[0,0,0];
    count++;R.put({name,at:point,piece,move,svg:`<g ${attrs}>${svg}</g>`,shapes:[R.solid(shape)]});
  }
  function box(name,p,z,h,tone='mid',attrs='',inner='',lit=false) {
    put(name,[p.x+p.w/2,p.y+p.d/2,z+h/2],S(k.slabOf(p,z,h,P,5,0.7),{tone,lit,inner}),A.slab(p,z,h,{name,owner:'vault'},5),attrs);
  }
  function disc(name,x,z,y,h,r,tone='mid',attrs='',inner='') {
    const F=plane(x,z,y);put(name,[x,y+h/2,z],S(G.disc(0,h,r,F,P,{bevel:0.5}),{tone,inner}),A.disc(F,0,h,r,{name,owner:'vault'}),attrs);
  }
  function ring(name,x,z,y,h,ri,ro,tone='mid',inner='') {
    const F=plane(x,z,y),paths=G.ringBand(0,h,ri,ro,F,P,{hole:[h,ri]});
    const svg=S(paths,{tone,inner}).replace('class="iso-fill"','class="iso-fill" fill-rule="evenodd"');
    put(name,[x,y+h/2,z],svg,A.ring(F,0,h,ri,ro,{name,owner:'vault'}));
  }
  function screws(points,size=0.48){return D(points.map(at),{size,tone:'mid'});}
  function faceInset(x,y,z,w,h,r=1){return L(k.pathOf(k.roundedPlan({x,y:z,w,d:h,r},5).map(([xx,zz])=>at([xx,y,zz])),true),{tone:'faint'});}
  function keyway(x,z,y,index,spare=false){
    const shape=L(k.pathOf([[-0.8,-3.8],[0.8,-3.8],[0.8,3.8],[-0.8,3.8]],true),{tone:'lo'});
    return `<g transform="${k.sideMatrix([x,y],z,P,'left')}" ${spare?'':`data-keyway="${index}"`}><g ${spare?'data-turn-spare':'data-turn-key'}="${index}">${shape}</g></g>`;
  }
  for(const [i,[x,y]] of k.corners(base,19).entries()){
    box(`stand.foot${i}`,{x:x-7,y:y-7,w:14,d:14,r:2},-14,6,'lo');
  }
  box('stand.base',base,-8,8,'lo','',L(k.sideSeam(base,-4,P,5),{tone:'faint'})+L(k.planOutline(k.insetPlan(base,5),0,P),{tone:'faint'})+screws(k.corners(base,10).map(([x,y])=>[x,y,0])));
  // The heavy jamb and rounded door bear the familiar safe silhouette.
  for(const x of [-110,94]){
    box(`jamb.shoe${x}`,{x:x-5,y:-12,w:26,d:58,r:3},0,8,'lo','',screws([[x+1,36,8],[x+14,36,8]]));
    const p={x,y:-3,w:16,d:39,r:2};
    box(`jamb.upright${x}`,p,8,196,'mid','',L(k.sideSeam(p,25,P,5),{tone:'faint'})+L(k.sideSeam(p,187,P,5),{tone:'faint'})+faceInset(x+4,36,34,8,144,2)+screws([34,64,94,124,154,184].flatMap(z=>[[x+3,36,z],[x+13,36,z]]),0.42));
    box(`jamb.cap${x}`,{x:x-2,y:-5,w:20,d:43,r:2},204,8,'mid');
  }
  box('jamb.crown',{x:-92,y:-3,w:184,d:39,r:2},196,16,'mid','',L(k.sideSeam({x:-92,y:-3,w:184,d:39,r:2},205,P,5),{tone:'faint'})+faceInset(-82,36,199,164,9,1.5));
  box('jamb.sill',{x:-94,y:-3,w:188,d:39,r:2},8,16,'mid','',faceInset(-82,36,12,164,8,1.5)+screws([[-78,36,16],[0,36,16],[78,36,16]]));
  // Back rim, solid door body, outer trim ring, concentric recessed machining.
  disc('door.back',0,110,4,8,86,'lo');
  disc('door.body',0,110,12,16,82,'mid');
  disc('door.face',0,110,28,2,82,'hi','',L(G.circleOf(plane(0,110,28),2,72,P),{tone:'faint'}));
  ring('door.rim',0,110,30,1,77,82,'hi',D(G.dotsOf(plane(0,110,30),1,79.3,32,P,{all:true}),{size:0.48,tone:'mid'}));
  // Two hinge barrels, with pinned shoulders and broad door straps.
  for(const z of [60,155]){
    box(`hinge.jamb-lug${z}`,{x:-94,y:29,w:1,d:14,r:0.2},z-7,14,'mid');
    box(`hinge.door-strap${z}`,{x:-79,y:30,w:26,d:8,r:1},z-5,10,'mid','',screws([[-73,38,z],[-59,38,z]]));
    const x=-86,y=36;
    for(let j=0;j<3;j++){
      const zz=z-12+j*8;const name=`hinge.barrel${z}.${j}`;
      put(name,[x,y,zz+3.7],S(k.cylinder(x,y,7,zz,7.4,P,48,0.5),{tone:'mid',inner:L(k.sideArc(x,y,7,zz+2,P,48),{tone:'faint'})}),A.cylinder(x,y,7,zz,7.4,{name,owner:'vault'}));
    }
    box(`hinge.pinhead${z}`,{x:x-3,y:y-3,w:6,d:6,r:1},z+11.4,2,'hi');
  }
  // A six-spoke handwheel: each spoke is a real radial member, tangent to hub/rim.
  const wx=-25,wz=105;
  disc('wheel.mount',wx,wz,30,5,11,'mid');
  disc('wheel.stem',wx,wz,35,5,7,'mid');
  ring('wheel.rim',wx,wz,44,5,25,29,'hi');
  disc('wheel.hub',wx,wz,44,5,7,'hi','',L(G.circleOf(plane(wx,wz,44),5,4.5,P),{tone:'faint'})+screws([[wx,49,wz]]));
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a),name=`wheel.spoke${i}`,F=plane(wx,wz,40);
    const poly=[[6,-1.5],[27,-1.5],[27,1.5],[6,1.5]].map(([u,v])=>[u*c-v*s,-u*s-v*c]);
    put(name,front(wx+c*16.5,wz+s*16.5,42),S(G.prismOf(F,poly,0,4,P),{tone:'mid'}),A.prism(F,poly,0,4,{name,owner:'vault'}));
  }
  // Combination dial has a closed scale ring, face-rooted radial graduations,
  // a knurled bezel, and a single pointer. Its pointer selects read or write.
  const dx=18,dz=133;
  disc('dial.mount',dx,dz,30,3,18,'mid');
  const dF=plane(dx,dz,33);
  disc('dial.body',dx,dz,33,6,15,'hi','',L(G.ribsOf(dF,0,6,15,40,P,{seams:true}),{tone:'lo'}));
  const tickPaths=[];
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,major=i%3===0;
    tickPaths.push(k.segment(G.pointOf(plane(dx,dz,40),0,10.5,a),G.pointOf(plane(dx,dz,40),0,major?7.8:9,a),P));
  }
  // Prebuilt pointer poses: each one points at an operation, not invented values.
  const needle0=k.segment([dx,40.3,dz],[dx-5,40.3,dz+6],P),needle1=k.segment([dx,40.3,dz],[dx+5,40.3,dz+6],P);
  const needles=`<g data-needle="0">${L(needle0,{tone:'hi',free:'end'})}</g><g data-needle="1" style="display:none">${L(needle1,{tone:'hi',free:'end'})}</g>${screws([[dx,40.3,dz]],0.8)}`;
  disc('dial.face',dx,dz,39,1,12,'hi','',L(G.circleOf(plane(dx,dz,39),1,10.5,P),{tone:'lo'})+L(tickPaths.join(''),{tone:'lo'})+needles);
  disc('dial.hub',dx,dz,40,0.6,1.4,'mid');
  // Seven optional replica keys arranged on the upper arc of the round door.
  for(let i=0;i<7;i++){
    const a=(145-i*(110/6))*Math.PI/180,x=Math.cos(a)*60,z=110+Math.sin(a)*60;
    const attrs=`data-cylinder="${i}"`;
    disc(`key.escutcheon${i}`,x,z,30,2,9,'mid',attrs,L(G.circleOf(plane(x,z,30),2,7.3,P),{tone:'faint'}));
    disc(`key.barrel${i}`,x,z,32,4,6,'hi',attrs,L(G.ribsOf(plane(x,z,32),0,4,6,20,P,{seams:true}),{tone:'lo'})+keyway(x,z,36.4,i));
  }
  // A replacement rack is not part of the circular original-replica door.
  for(const x of [128,208]){
    box(`rack.shoe${x}`,{x:x-4,y:0,w:24,d:40,r:3},0,7,'lo','',screws([[x+1,33,7],[x+15,33,7]]));
    box(`rack.post${x}`,{x,y:8,w:16,d:18,r:2},7,178,'mid','',L(k.sideSeam({x,y:8,w:16,d:18,r:2},175,P,5),{tone:'faint'})+faceInset(x+4,26,20,8,145,2)+screws([24,54,84,114,144,174].flatMap(z=>[[x+3,26,z],[x+13,26,z]]),0.42));
    box(`rack.cap${x}`,{x:x-3,y:5,w:22,d:24,r:2},185,4,'mid');
  }
  for(let i=0;i<7;i++){
    const z=38+i*20,attrs=`data-spare="${i}"`;
    box(`rack.crossplate${i}`,{x:144,y:8,w:64,d:18,r:1},z-8,16,'lo','',L(k.segment([144,26,z-6],[208,26,z-6],P),{tone:'faint'})+screws([[148,26,z+5],[204,26,z+5]])+L(G.circleOf(plane(160,z,26),0,6,P),{tone:'faint'})+faceInset(179,26,z-4,23,8,0.7));
    disc(`spare.seat${i}`,160,z,26,2,7,'mid',attrs);
    disc(`spare.key${i}`,160,z,28,5,4.5,'hi',attrs,L(G.circleOf(plane(160,z,28),5,3.9,P),{tone:'lo'})+keyway(160,z,33.1,i,true));
    box(`spare.hint${i}`,{x:179,y:26,w:23,d:1,r:0.7},z-4,8,'mid',attrs,L(k.segment([182,27,z],[198,27,z],P),{tone:'faint',free:true}));
  }
  // Quorum bolts: short, visibly retracting bars terminate flush on the jamb.
  for(const [j,z] of [103,74].entries()){
    const ticks=k.sideTicks(36,94,4,4,33,z+5,[1.3,2.5],P,'x');
    box(`bolt.rail${j}`,{x:36,y:30,w:58,d:3,r:0.6},z-5,10,'lo','',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
    box(`bolt.slider${j}`,{x:61,y:33,w:33,d:5,r:0.7},z-2.2,4.4,'hi',`data-bolt="${j}"`,'',j===0);
    for(const x of [52,80]){
      box(`bolt.gland.lower${j}.${x}`,{x,y:33,w:7,d:8,r:1},z-5,2.8,'mid');
      box(`bolt.gland.upper${j}.${x}`,{x,y:33,w:7,d:8,r:1},z+2.2,2.8,'mid','',screws([[x+3.5,41,z+3.6]]));
    }
    box(`bolt.jambplate${j}`,{x:94,y:36,w:13,d:2,r:0.6},z-7,14,'mid','',screws([[100,38,z-4],[100,38,z+4]]));
  }
  box('overlap.track',{x:40,y:30,w:8,d:3,r:1},79,19,'lo');
  box('overlap.link.left',{x:41,y:33,w:2,d:4,r:0.4},79,19,'mid','data-link');
  box('overlap.link.right',{x:45,y:33,w:2,d:4,r:0.4},79,19,'mid','data-link');
  box('overlap.link.lower',{x:43,y:33,w:2,d:4,r:0.4},79,2,'mid','data-link');
  box('overlap.link.upper',{x:43,y:33,w:2,d:4,r:0.4},96,2,'mid','data-link');
  for(const z of [84,93]){
    disc(`overlap.guide${z}`,44,z,33,12,1,'mid');
    disc(`overlap.cap${z}`,44,z,45,2,2.5,'hi');
  }
  // The stamped service plate resolves the last bare region of the door face.
  box('service.plate',{x:-22,y:30,w:46,d:1,r:1},43,14,'lo','',screws([[-18,31,50],[20,31,50]])+L([[-12,47,27],[-12,50,23],[-12,53,19]].map(([x,z,len])=>k.segment([x,31,z],[x+len,31,z],P)).join(''),{tone:'faint',free:true}));
  const poses=[];
  for(let r=0;r<=8;r++)for(let w=0;w<=8;w++)for(let o=0;o<=8;o++)poses.push({label:`stroke ${r}/8 ${w}/8 ${o}/8`,shares:{read:r/8,write:w/8,overlap:o/8}});
  A.settle(R,P,{states:poses});R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv:audit?['--audit']:argv,frames:poses,apart:true});
  const body=halo(base,-14,8)+R.items.map(item=>item.svg.replace('<g ',`<g data-k=\"${item.key}\" data-piece=\"${item.piece}\" data-lift=\"${G.dot3(item.move,G.viewOf(P))}\" `)).join('');
  return {markup:plate({id:6,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'},{mark:'edge',key:'key.2'},{mark:'dim',key:'key.3'}]}),data:{P,parts:count}};
}
