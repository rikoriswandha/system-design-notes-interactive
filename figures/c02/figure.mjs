import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as G from '../kit/lathe.mjs';
import * as A from '../kit/audit.mjs';

// A cutaway pinwheel arithmometer. The seven open setting tracks expose the
// pinwheels; the front carriage carries four banks of independently numbered
// drums. The actual peak multiplier is also the side crank's turn counter.
export async function build({ argv }) {
  const base={x:-158,y:-77,w:327,d:164,r:9};
  const bounds=[...k.boxCorners(base,-24,0),[-137,-61,51],[119,36,51],[165,28,66],[-137,78,38]];
  const P=k.fitProjection(bounds,WIDTH,HEIGHT,{pad:38,azimuth:56,elevation:34});
  const {S,L,D,halo}=painter(P);
  const R=A.recorder(P);
  let count=0;
  const controls=[['dau',1,500,1],['posts',1,20,1],['media',0,100,1],['size',0.1,20,0.1],['years',1,10,1],['peak',1,10,1],['replicas',1,5,1]];
  const put=(name,at,svg,shape)=>{
    count++;
    const moving=name.startsWith('register.');
    R.put({name,piece:moving?'carriage':name,move:moving?[10,0,0]:undefined,at,svg,shapes:[R.solid(shape)]});
  };
  const slab=(name,p,z,h,tone='mid',inner='',attrs='',meta={})=>{
    put(name,[p.x+p.w/2,p.y+p.d/2,z+h/2],`<g ${attrs}>${S(k.slabOf(p,z,h,P,6,0.6),{tone,inner})}</g>`,A.slab(p,z,h,{name,...meta},6));
  };
  const cyl=(name,x,y,r,z,h,tone='mid',inner='',attrs='')=>{
    put(name,[x,y,z+h/2],`<g ${attrs}>${S(k.cylinder(x,y,r,z,h,P,48,0.4),{tone,inner})}</g>`,A.cylinder(x,y,r,z,h,{name}));
  };
  const disc=(name,F,s0,s1,r,tone='mid',inner='',attrs='',meta={})=>{
    put(name,G.pointOf(F,(s0+s1)/2,0,0),`<g ${attrs}>${S(G.disc(s0,s1,r,F,P,{steps:48}),{tone,inner})}</g>`,A.disc(F,s0,s1,r,{name,...meta}));
  };
  const ring=(name,F,s0,s1,r0,r1,tone='mid',inner='',attrs='',meta={})=>{
    put(name,G.pointOf(F,(s0+s1)/2,0,0),`<g ${attrs}>${S(G.ringBand(s0,s1,r0,r1,F,P,{steps:48}),{tone,inner})}</g>`,A.ring(F,s0,s1,r0,r1,{name,...meta}));
  };
  const prism=(name,F,polygon,s0,s1,tone='mid',inner='',attrs='')=>{
    put(name,G.pointOf(F,(s0+s1)/2,0,0),`<g ${attrs}>${S(G.prismOf(F,polygon,s0,s1,P),{tone,inner})}</g>`,A.prism(F,polygon,s0,s1,{name}));
  };
  const screwTop=(x,y,z)=>L(k.ring(x,y,1.8,z,P,24),{tone:'lo'})+D([k.iso([x,y,z],P)],{size:.45});
  const screwFace=(F,s,y,z)=>{
    const Q=G.frameAlong([F.o[0]+s,y,z],[1,0,0]);
    return L(G.circleOf(Q,0,1.8,P,24),{tone:'lo'})+D([k.iso(Q.o,P)],{size:.45});
  };

  // Feet are deliberately close to the edge: the flanges and rubber toes remain
  // visible instead of disappearing behind the skirt of the base.
  for(const [i,[x,y]] of k.corners(base,11).entries()){
    cyl(`stand.toe${i}`,x,y,7,-24,10,'lo');
    cyl(`stand.foot${i}`,x,y,8,-14,4,'mid',L(k.sideArc(x,y,8,-12,P,32),{tone:'faint'}));
  }
  slab('stand.base',base,-10,10,'lo',L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+k.corners(base,7).map(([x,y])=>screwTop(x,y,0)).join(''));
  const floor={x:-125,y:-58,w:235,d:93,r:3};
  slab('mechanism.floor',floor,0,16,'mid',L(k.sideSeam(floor,10,P,6),{tone:'faint'}));
  slab('case.back',{x:-125,y:-58,w:235,d:5,r:1.2},16,30,'mid',L(k.sideSeam({x:-125,y:-58,w:235,d:5,r:1.2},40,P,6),{tone:'faint'}));
  const frontPlan={x:-125,y:30,w:235,d:5,r:1.2};
  slab('case.front',frontPlan,16,30,'mid',L(k.sideSeam(frontPlan,39,P,6),{tone:'faint'}));
  const endShape=k.roundedPlan({x:-58,y:0,w:93,d:50,r:5},6);
  for(const [name,x] of [['left',-132],['right',110]]){
    const F=G.frameAlong([x,0,0],[1,0,0]);
    const screws=[[-50,8],[27,8],[-50,42],[27,42]].map(([y,z])=>screwFace(F,6,y,z)).join('');
    const trim=k.pathOf(k.roundedPlan({x:-54,y:4,w:85,d:42,r:3},6).map(([y,z])=>k.iso([x+6,y,z],P)),true);
    prism(`case.end.${name}`,F,endShape,0,6,'mid',L(trim,{tone:'faint'})+screws);
    if(name==='right'){
      // The side turn register displays the real peak multiplier, not an
      // animation-frame count. Text is in the end plate's y/z face plane.
      const counterPoly=k.roundedPlan({x:5,y:29,w:22,d:13,r:1.2},5);
      const counterFrame=G.frameAlong([x+6,0,0],[1,0,0]);
      const opening=k.pathOf(counterPoly.map(([y,z])=>k.iso([x+7,y,z],P)),true);
      const face=k.sideMatrix([x+7,16],35.5,P,'right');
      prism('counter.frame',counterFrame,counterPoly,0,1,'hi',L(opening,{tone:'lo'})+`<clipPath id="c02-turn-counter"><path d="${opening}"/></clipPath><g clip-path="url(#c02-turn-counter)"><text data-turns transform="${face}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="8" fill="var(--anatomy-hi)"></text></g>`);
    }
  }

  // Narrow roof lands, not a solid pretend housing behind the openings. Each
  // slit really opens onto a ring-shaped pinwheel in the mechanism cavity.
  const xs=controls.map((_,i)=>-109+i*29);
  const boundaries=[-125,...xs.flatMap(x=>[x-7,x+7]),110];
  for(let i=0;i<boundaries.length;i+=2){
    const x=boundaries[i],w=boundaries[i+1]-x;
    const outline=L(k.planOutline({x:x+1,y:-51,w:w-2,d:79,r:.6},46,P),{tone:'faint'});
    const lid=w>30?L(k.planOutline({x:x+4,y:-43,w:w-8,d:60,r:2},46,P),{tone:'lo'})+screwTop(x+7,-39,46)+screwTop(x+w-7,13,46)+L([-28,-23,-18].map((y,j)=>k.lineOnTop([x+10,y],[x+w-10-j*2,y],46,P)).join(''),{tone:'lo',free:true}):'';
    slab(`case.roof${i/2}`,{x,y:-53,w,d:83,r:1},44,2,'mid',outline+lid);
  }
  const wheelFrames=[];
  controls.forEach(([key],i)=>{
    const x=xs[i];
    const F=G.frameAlong([x-5,-8,30],[1,0,0]);
    wheelFrames.push(F);
    const ribs=G.ribsOf(F,0,10,14,32,P,{fade:[.1,.55],seams:true});
    const faceMarks=L(G.circleOf(F,10,3,P,32)+G.circleOf(F,10,13,P,48),{tone:'faint'})+`<path class="iso-line" data-tone="lo" data-pinwheel="${key}" d="${G.spokesOf(F,10,3,13,12,P)}"/>`;
    disc(`pinwheel.${key}`,F,0,10,14,'hi',k.fadedSvg(ribs,{tone:'lo'})+faceMarks);
    const cheek=G.frameAlong([x-7,-8,30],[1,0,0]);
    disc(`pinwheel.end.${key}`,cheek,0,2,14,'mid',L(G.circleOf(cheek,2,10,P,48),{tone:'faint'}));
    for(const side of [-1,1]){
      const rail={x:x+side*7-(side>0?0:2),y:-43,w:2,d:65,r:.5};
      slab(`track.${key}.${side}`,rail,46,1,'mid');
    }
    const ruler={x:x+9,y:-43,w:4,d:65,r:.5};
    const ticks=k.topTicks(-40,18,5,5,ruler.x+.4,47,[1.5,3],P,'y');
    slab(`ruler.${key}`,ruler,46,1,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
    for(const y of [-47,22])slab(`stop.${key}.${y}`,{x:x-9,y,w:18,d:4,r:1},46,3,'mid',screwTop(x,y+2,49));
    slab(`shoe.${key}`,{x:x-9,y:-42,w:18,d:7,r:1},47,2,'hi','',`data-lever="${key}"`);
    cyl(`handle.${key}`,x,-38.5,4.2,49,7,'hi',L(k.knurl(x,-38.5,4.2,49,56,36,P),{tone:'lo'})+L(k.ring(x,-38.5,2.5,56,P,32),{tone:'faint'}),`data-lever="${key}"`);
  });

  // Front carriage: rails, end stops and four bearing shoes support a sliding
  // tray. Every number wheel is a real annular solid, with its axle in the bore.
  for(const y of [42,75]){
    slab(`guide.${y}`,{x:-133,y,w:268,d:4,r:1},0,8,'mid');
    for(const x of [-139,135])slab(`guide.stop.${x}.${y}`,{x,y:y-2,w:6,d:8,r:1},0,10,'mid',screwTop(x+3,y+2,10));
  }
  const carriageMove=[10,0,0];
  const carriageAttrs='data-carriage';
  const tray={x:-128,y:42,w:244,d:37,r:3};
  slab('register.tray',tray,8,5,'hi',L(k.sideSeam(tray,11,P,6),{tone:'faint'}),carriageAttrs);
  for(const x of [-132,116])for(const y of [43,73])slab(`register.shoe.${x}.${y}`,{x,y,w:4,d:5,r:1},8,5,'mid',screwTop(x+2,y+2.5,13),carriageAttrs);
  // The tray rim is split into four bars; it is not a filled block hiding the drums.
  for(const [name,p] of [['back',{x:-128,y:42,w:244,d:3,r:1}],['front',{x:-128,y:76,w:244,d:3,r:1}],['left',{x:-128,y:45,w:3,d:31,r:1}],['right',{x:113,y:45,w:3,d:31,r:1}]]){
    let details=L(k.sideSeam(p,19,P,6),{tone:'faint'});
    if(name==='front')for(let i=0;i<4;i++){
      const x=-119+i*57;
      const cover=k.roundedPlan({x,y:22,w:49,d:9,r:1.2},5);
      details+=L(k.pathOf(cover.map(([x,z])=>k.iso([x,79,z],P)),true),{tone:'faint'});
      for(const at of [[x+3,26.5],[x+46,26.5]]){
        const F=G.frameAlong([at[0],79,at[1]],[0,1,0]);
        details+=L(G.circleOf(F,0,1.2,P,24),{tone:'lo'})+D([k.iso(F.o,P)],{size:.4});
      }
    }
    slab(`register.rim.${name}`,p,13,21,'mid',details,carriageAttrs);
  }
  const axle=G.frameAlong([-125,60,24],[1,0,0]);
  const axleCuts=[];
  const digitFrames=[];
  const displayOverlays=[];
  for(let i=0;i<4;i++){
    const x=-119+i*57;
    // Two cheeks in each bank carry the shared axle and sit on the tray.
    for(const end of [x,x+49]){
      const F=G.frameAlong([end,60,24],[1,0,0]);
      ring(`register.bearing.${i}.${end}`,F,0,2,1.5,11,'mid',L(G.circleOf(F,2,8,P,48),{tone:'faint'}),carriageAttrs);
      axleCuts.push([end+125,end+127]);
    }
    const bank=[];
    for(let digit=0;digit<9;digit++){
      const dx=x+3+digit*4.8;
      const F=G.frameAlong([dx,60,24],[1,0,0]);
      ring(`register.drum.${i}.${digit}`,F,0,4.4,1.5,9,'hi',L(G.arcOf(F,2.2,9,P),{tone:'faint'}),carriageAttrs);
      axleCuts.push([dx+125,dx+129.4]);
      bank.push({x:dx+2.2,y:60,z:33.1});
    }
    digitFrames.push(bank);
    // The opening has actual back/front lips and end walls. Both the drum
    // markings and their movement are clipped to the same opening.
    const p={x:x+2,y:46,w:47,d:28,r:1};
    for(const [name,q] of [['back',{x:p.x,y:p.y,w:p.w,d:4,r:1}],['front',{x:p.x,y:70,w:p.w,d:4,r:1}]])slab(`register.lip.${i}.${name}`,q,13,21,'mid',screwTop(q.x+3,q.y+2,34)+screwTop(q.x+q.w-3,q.y+2,34),carriageAttrs);
    const opening={x:x+2,y:50,w:47,d:20,r:.6};
    const clip=k.planOutline(opening,34,P);
    const text=bank.map((at,j)=>`<g transform="${k.topMatrix([at.x,at.y],at.z,P,'x')}"><text data-digit="${i}.${j}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="6.3" fill="var(--anatomy-hi)"></text></g>`).join('');
    const overlay=`<g ${carriageAttrs}><clipPath id="c02-bank-${i}"><path d="${clip}"/></clipPath><g clip-path="url(#c02-bank-${i})">${text}</g>${L(k.planOutline(opening,34,P),{tone:'lo'})}</g>`;
    // Display marks are not solids; the independently checked frame outline
    // shares the physical lip's edge and clips every drum's numeric marking.
    displayOverlays.push(overlay);
  }
  // Split the visible shaft at every wheel and bearing: a single shaft drawn
  // through all annuli cannot have one correct painter key at every crossing.
  let shaftStart=0;
  axleCuts.sort((a,b)=>a[0]-b[0]).forEach(([start,end],i)=>{
    if(start>shaftStart)disc(`register.axle.${i}`,axle,shaftStart,start,1.5,'mid','',carriageAttrs);
    shaftStart=Math.max(shaftStart,end);
  });
  if(shaftStart<238)disc('register.axle.end',axle,shaftStart,238,1.5,'mid','',carriageAttrs);
  const ruler={x:-124,y:81,w:234,d:4,r:.7};
  const rt=k.topTicks(ruler.x+3,ruler.x+ruler.w-3,5,5,ruler.y+.3,.7,[1.5,3],P);
  slab('carriage.ruler',ruler,0,.7,'lo',L(rt.minor,{tone:'lo'})+L(rt.major,{tone:'mid'}));
  const label={x:-154,y:38,w:12,d:26,r:1};
  slab('stand.label',label,0,.8,'lo',L(k.planOutline(k.insetPlan(label,1.5),.8,P),{tone:'faint'})+L([0,1,2].map(i=>k.lineOnTop([label.x+3,label.y+6+i*4],[label.x+9-i,label.y+6+i*4],.8,P)).join(''),{tone:'lo',free:true})+screwTop(label.x+6,label.y+22,.8));

  const crank=G.frameAlong([116,-10,35],[1,0,0]);
  disc('crank.bearing',crank,0,8,10,'mid',L(G.circleOf(crank,8,7.5,P,48),{tone:'lo'}));
  disc('crank.shaft',crank,8,28,3.5,'hi');
  const crankPolygon=G.stadium(6,4.8,24,48);
  const crankArm=G.prismOf(crank,crankPolygon,28,31,P);
  const gripFrame=G.frameAlong(G.pointOf(crank,31,24,0),[1,0,0]);
  const gripProfile=[[0,4.4],[2,4.4],[2,5.2],[17,5.2],[17,4.4],[19,4.4]];
  const gripPaths=G.solidOf(gripProfile,gripFrame,P,{steps:48});
  put('crank.arm',G.pointOf(crank,29.5,12,0),`<g data-crank-arm>${S(crankArm,{tone:'hi'})}</g>`,A.prism(crank,crankPolygon,28,31,{name:'crank.arm'}));
  put('crank.grip',G.pointOf(gripFrame,9.5,0,0),`<g data-crank-grip>${S(gripPaths,{tone:'hi',lit:true,inner:k.fadedSvg(G.ribsOf(gripFrame,2,17,5.2,36,P,{fade:[.1,.55],seams:true}),{tone:'lo'})})}</g>`,A.solid(gripFrame,gripProfile,{name:'crank.grip'}));

  const carriageStates=Array.from({length:11},(_,i)=>({label:`carriage ${i/10}`,shares:{carriage:i/10}}));
  A.settle(R,P,{states:carriageStates});
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv,frames:carriageStates,apart:true});
  const V=G.viewOf(P);
  const ordered=R.items.map(item=>`<g data-order-item data-key="${item.key}" data-lift="${G.dot3(item.move||[0,0,0],V)}">${item.svg}</g>`).join('');
  const body=`<style>[data-figure="2"] [data-lever][data-chosen] .iso-edge{stroke:var(--anatomy-hi);stroke-width:1.1}</style>`+halo(base,-24,11)+`<g data-order-layer>${ordered}</g>`+displayOverlays.join('');
  return {
    markup:plate({id:2,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'},{mark:'flat',key:'key.2'}]}),
    data:{P,controls,parts:count,leverOriginZ:56,leverXs:xs,digitFrames,wheelFrames,crank,crankPolygon,gripProfile,carriageMove}
  };
}
