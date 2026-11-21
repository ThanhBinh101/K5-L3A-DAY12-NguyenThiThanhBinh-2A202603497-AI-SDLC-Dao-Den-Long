import { makeRenderer, sphereGeometry, cylinderGeometry, islandGeometry, ringGeometry, rampGeometry, slabGeometry } from './world-gl.mjs';

const palette = Object.fromEntries(Object.entries({
  grass: '#2F5D50', land: '#25384F', bluff: '#2F5D50', path: '#C9B48A', rose: '#f78eb9',
  blush: '#ffb2d3', pink: '#ffd2e4', peach: '#fac4b5', raspberry: '#b75684',
  cream: '#fff5df', ink: '#452948', dark: '#423457', plum: '#796385',
  lilac: '#ab91c0', mint: '#93c6aa', moss: '#659d8a', ocean: '#12384A',
  stone: '#ce98af', deepStone: '#a77899', shadow: '#764764',
  gold: '#F2C14E', amber: '#e58b68', ember: '#984c5e', violet: '#745e8f',
  leaf: '#78bba8', white: '#F5F1E6', light: '#FFF6C2', moteHalo: '#FFE58A', litPaper: '#FFB347', litCore: '#FFE9B0', offPaper: '#5B5F6E', sky: '#0E1430', fog: '#1B2350', wood: '#6B4A2F', shade: '#120A1A', outline: '#7A3CFF', stunned: '#3A3450', coat: '#E8E2D0', scarf: '#C8102E', drifter: '#8FA3B8', danger: '#FF5A5F',
}).map(([name, hex]) => {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  return [name, [...rgb, 1]];
}));

const alpha = (color, opacity) => [...color.slice(0, 3), opacity];
const radians = Math.PI * 2;
const coordinate = (object) => object?.z ?? object?.y ?? 0;

function randomSequence() {
  let state = 874301;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function environment(radius) {
  const random = randomSequence();
  const treeSites = [
    [-.72, .35, 1.15], [.73, .35, 1.05], [-.48, .63, 1.35], [.74, -.33, 1.12],
    [-.79, -.27, .9], [-.40, -.61, 1.06], [.42, -.63, .96], [-.58, -.54, 1.05],
    [.27, .71, .76], [.82, -.12, .86], [-.28, -.83, .82], [.55, -.62, 1.08],
  ];
  const trees = treeSites.map(([x, z, scale], i) => [radius*x, radius*z, scale, i % 3]);
  const blossoms = [];
  const rocks = [];

  for (let i = 0; i < 264; i++) {
    const distance = radius * Math.sqrt(random()) * .98;
    const angle = random() * radians;
    const x = Math.cos(angle)*distance;
    const z = Math.sin(angle)*distance;
    if (Math.abs(x) < 2.1 && z > -.30 * radius) continue;
    const size = .46 + random()*.64;
    blossoms.push([x, z, size, Math.floor(random()*4), random()*radians]);
  }
  for (let i = 0; i < 26; i++) {
    const angle = i*radians/26 + random()*.14;
    const distance = radius * (.72 + random()*.27);
    rocks.push([Math.cos(angle)*distance, Math.sin(angle)*distance, .2+random()*.68]);
  }
  const petals = Array.from({ length: 25 }, () => [
    random() * radians, random() * radius, random()*3.2+.45, random()*radians,
  ]);
  return { trees, blossoms, rocks, petals };
}

export function createWorld(canvas) {
  const renderer = makeRenderer(canvas);
  const ball = renderer.register(sphereGeometry(12, 18));
  const bud = renderer.register(sphereGeometry(6, 9));
  const rock = renderer.register(sphereGeometry(4, 7));
  const bloom = renderer.register(sphereGeometry(4, 6));
  const tube = renderer.register(cylinderGeometry(1, 1, 18));
  const stem = renderer.register(cylinderGeometry(.6, 1, 7));
  const hat = renderer.register(cylinderGeometry(.04, 1, 24));
  const stand = renderer.register(cylinderGeometry(.75, 1, 8));
  const top = renderer.register(islandGeometry());
  const bank = renderer.register(islandGeometry(true));
  const loop = renderer.register(ringGeometry(1,.94));
  const disk = renderer.register(ringGeometry(1,0));
  const diamond = renderer.register(cylinderGeometry(0, 1, 4));
  const deck = renderer.register(slabGeometry());
  const upperArc = renderer.register(ringGeometry(24,12,Math.PI));
  const rampEast = renderer.register(rampGeometry(30,12,24,2,3,3));
  const rampWest = renderer.register(rampGeometry(150,12,24,2,3,3));
  const rampRiseEast = renderer.register(rampGeometry(30,24,30,1.5,0,3));
  const rampRiseWest = renderer.register(rampGeometry(150,24,30,1.5,0,3));
  const p = palette;

  function ellipsoid(x, y, z, sx, sy, sz, color, details, shape = ball) {
    renderer.draw(shape, [x, y, z], [sx, sy, sz], color, details);
  }
  function cyl(x, y, z, sx, sy, sz, color, details, shape = tube) {
    renderer.draw(shape, [x, y, z], [sx, sy, sz], color, details);
  }
  function floor(shape, x, y, z, sx, sz, color, details) {
    renderer.draw(shape, [x, y, z], [sx, 1, sz], color, details);
  }

  let mapRadius = null;
  let scenery;
  let lastPoint;
  let travelTime = 0;

  function tree(x, z, scale, family) {
    const [main, light, shade] = [
      [p.blush, p.pink, p.rose], [p.peach, p.cream, p.blush], [p.lilac, p.pink, p.lilac],
    ][family];
    floor(disk, x+.18, .012, z+.1, .91*scale, .58*scale, alpha(p.shadow,.13), { glow: 1 });
    cyl(x, .75*scale, z, .21*scale, .77*scale, .24*scale, p.raspberry, { roll: -.1 }, stem);
    cyl(x-.32*scale, 1.13*scale, z, .085*scale, .49*scale, .079*scale, p.raspberry, { roll: .63 }, stem);
    cyl(x+.31*scale, 1.19*scale, z, .077*scale, .54*scale, .078*scale, p.raspberry, { roll: -.56 }, stem);
    ellipsoid(x, 2.02*scale,z, 1.06*scale,.89*scale,.90*scale, main);
    ellipsoid(x-.65*scale,1.77*scale,z+.08, .69*scale,.60*scale,.61*scale, shade);
    ellipsoid(x+.59*scale,1.97*scale,z-.1, .72*scale,.58*scale,.62*scale, main);
    ellipsoid(x-.16*scale,2.56*scale,z-.10, .61*scale,.54*scale,.58*scale, light);
    for (const [dx, dy, dz] of [[-.35,2.39,.59],[.24,2.77,.32],[.77,2.10,.47],[-.78,1.95,.55]]) {
      ellipsoid(x+dx*scale, dy*scale,z+dz*scale,.085*scale,.06*scale,.048*scale,p.cream,{glow:.5},bud);
    }
  }

  function flower(x, z, scale, type, angle, time) {
    const stemSize = .22 * scale;
    const hue = [p.cream, p.raspberry, p.lilac, p.blush][type];
    const sway = .12*Math.sin(time*1.3+angle);
    cyl(x, stemSize*.47, z, .024, stemSize*.53, .024, p.moss, { roll: sway }, stem);
    ellipsoid(x-.08*scale, stemSize*.42, z, .115*scale, .031*scale, .047*scale, p.mint, { roll: -.36, yaw: angle }, bloom);
    ellipsoid(x+.07*scale, stemSize*.34, z+.018, .094*scale, .036*scale, .038*scale, p.leaf, { roll: .41, yaw: angle }, bloom);
    if (type !== 1 && type !== 3) {
      ellipsoid(x, stemSize+.041, z, .055*scale,.043*scale,.053*scale,p.gold,{glow:.35},bloom);
      for (let i = 0; i < 4; i++) {
        const ray = angle + i*radians/4;
        ellipsoid(x+Math.cos(ray)*.095*scale, stemSize+.03, z+Math.sin(ray)*.095*scale,
          .071*scale,.032*scale,.052*scale,hue,{yaw:-ray,glow:.22},bloom);
      }
    } else {
      ellipsoid(x, stemSize+.032, z, .077*scale,.085*scale,.077*scale,hue,{glow:.13},bloom);
      ellipsoid(x, stemSize+.096, z+.017, .028*scale,.035*scale,.031*scale,p.pink,{glow:.22},bloom);
    }
  }

  function mist(time) {
    floor(disk, 0, -1.01, 0, 150, 150, p.ocean, { glow: .96, surface: 2 });
    // Distant cloud banks and islets give the horizon depth while leaving the trail unobstructed.
    for (const [i, z] of [-55, -63, -45, -40, -56].entries()) {
      const x = (i-2)*20;
      const h = 2.2 + (i % 3)*1.2;
      ellipsoid(x, -.9, z, 11+i%2, h, 8, i%2 ? p.fog : p.violet, { glow:.4 }, bud);
      ellipsoid(x-4, .45, z+2, 7, h*.58, 8, p.fog, { glow:.65 }, bud);
    }
    for (const [x,y,z] of [[-21,7.4,-38], [12,8.3,-47], [29,6.8,-32],[-34,5.6,-21]]) {
      const drift = Math.sin(time*.12+x)*1.2;
      ellipsoid(x+drift, y,z, 5.5,.62,1.04,alpha(p.drifter,.22),{glow:1},bud);
      ellipsoid(x-2+drift,y+.55,z,2.3,.69,1.12,alpha(p.drifter,.23),{glow:1},bud);
      ellipsoid(x+1+drift,y+.83,z,2.5,.99,1.38,alpha(p.drifter,.29),{glow:1},bud);
    }

  }

  function diskIsland(radius, originX = 0) {
    renderer.draw(bank, [originX,-.28,0],[radius, 2.65, radius],p.land);
    renderer.draw(bank, [originX,0,0],[radius, .55, radius],p.bluff);
    floor(disk, originX, 0, 0, radius, radius, p.grass, { glow: .35, surface: 1 });
    floor(loop, originX,-.995,0,radius*1.035,radius*1.035,alpha(p.drifter,.24),{glow:.9});
  }

  function landscape(radius, time, night) {
    mist(time);
    diskIsland(night === 2 ? 28 : radius);
    if (night === 2) {
      diskIsland(28,70);
      const bridge = { glow: .4 };
      for (let i = 0; i < 22; i++) {
        floor(deck,26+i*18/22,.036,0,.36,2,p.wood,bridge);
      }
      for (const x of [26,29,33,37,41,44]) {
        cyl(x,.36,2,.11,.40,.11,p.wood,bridge,stand);
        cyl(x,.36,-2,.11,.40,.11,p.wood,bridge,stand);
      }
      launchPad(20,0,18,time);
      launchPad(50,0,-18,time);
      for (const [x,z,scale] of scenery.trees) tree(70+x,z,scale,2);
    }
    if (night === 3) {
      floor(upperArc,0,3.01,0,1,1,p.grass,{glow:.47,surface:1});
      floor(upperArc,0,2.88,0,1.006,1.006,p.stone,{glow:.35});
      for (const ramp of [rampEast,rampWest,rampRiseEast,rampRiseWest]) floor(ramp,0,.018,0,1,1,p.path,{glow:.37});
      cyl(0,4.48,0,8,1.5,8,p.stone,{glow:.36});
      floor(disk,0,6.01,0,8,8,p.grass,{glow:.55,surface:1});
      cyl(0,7,0,2,1,2,p.wood,{glow:.41});
      cyl(0,8.13,0,2.17,.14,2.17,p.wood,{glow:.42});
      cyl(0,8.50,0,1.98,.19,1.98,p.scarf,{glow:.43},hat);
      launchPad(0,3,13,time);
      floor(loop,0,6.019,0,7.97,7.97,alpha(p.gold,.36),{glow:1});
    }
    const pathStart = radius*.79;
    const pathEnd = -radius*.57;
    for (let point = 0; point < 27; point++) {
      const z = pathStart + (pathEnd-pathStart)*point/26;
      if (night === 3 && z > 2 && z < 27) continue;
      const x = z < -2 ? Math.sin((-2-z)*.19)*1.4 : Math.sin(z*.28)*.22;
      floor(disk, x, .008+point*.00007, z, 1.3+Math.sin(point*.35)*.25,1.76,p.path,{ glow: .31, surface: 1 });
      ellipsoid(x + Math.sin(point*2.7)*1.48, .035, z+.12, .15, .054, .095, point%2 ? p.stone : p.cream, {yaw:point}, rock);
    }

    for (const [x,z,size] of scenery.rocks) {
      floor(disk,x+.13,.013,z+.08,size*.93,size*.69,alpha(p.shadow,.13),{glow:1});
      ellipsoid(x,size*.28,z,size*.88,size*.65,size*.76,p.stone,{yaw:x,roll:.2},rock);
      ellipsoid(x+size*.7,size*.13,z+.05,size*.42,size*.34,size*.58,p.deepStone,{yaw:z},rock);
      ellipsoid(x-size*.12,size*.67,z+.12,size*.46,size*.17,size*.47,p.mint,{yaw:z},rock);
    }
    for (const [index, [fx, fz]] of [[-.20,.58],[.23,.56],[-.40,.18],[.37,.10],[-.30,-.24],[.39,-.32]].entries()) {
      const x = radius*fx;
      const z = radius*fz;
      for (const side of [-1,0,1]) {
        const scale = 1 - Math.abs(side)*.29;
        const px = x+side*.40;
        const pz = z+Math.abs(side)*.16;
        cyl(px,.18*scale,pz,.066*scale,.18*scale,.066*scale,p.cream,{roll:side*.15},stem);
        ellipsoid(px,.36*scale,pz,.24*scale,.15*scale,.25*scale,index%2 ? p.rose : p.lilac,{roll:side*.12},bud);
        ellipsoid(px-.08*scale,.43*scale,pz+.12*scale,.051*scale,.025*scale,.055*scale,p.cream,{glow:.45},bloom);
        ellipsoid(px+.09*scale,.45*scale,pz-.025*scale,.035*scale,.025*scale,.039*scale,p.cream,{glow:.45},bloom);
      }
    }
    for (const entry of scenery.trees) tree(...entry);
    for (const entry of scenery.blossoms) flower(...entry,time);

    for (const [bearing, distance, height, phase] of scenery.petals) {
      const drift = time*.28 + phase;
      const x = Math.cos(bearing)*distance + Math.sin(drift)*1.32;
      const z = Math.sin(bearing)*distance + Math.cos(drift)*1.08;
      const y = height + Math.sin(drift*1.4)*.36;
      ellipsoid(x,y,z,.06,.025,.108,alpha(p.cream,.73),{yaw:time+phase,roll:drift,glow:1},bud);
    }
  }

  function launchPad(x,y,z,time) {
    const glow = .82 + .18*Math.sin(time*3.8);
    cyl(x,y+.08,z,.9,.08,.9,p.wood,{glow:.52},stand);
    floor(disk,x,y+.168,z,.82,.82,p.outline,{glow:.8});
    floor(loop,x,y+.185,z,.94,.94,p.gold,{glow});
    cyl(x,y+.22,z,.48,.065,.48,p.litPaper,{glow},stand);
  }

  function shadow(x, z, width, depth, y = 0) {
    floor(disk, x,y+.023,z,width,depth,alpha(p.shadow,.25),{glow:1});
  }

  function lantern(item, time) {
    const { x, lit } = item;
    const z = coordinate(item);
    const base = item.y ?? 0;
    const metal = p.wood;
    const paper = lit ? p.litPaper : p.offPaper;
    const halo = lit ? p.litPaper : p.drifter;
    const band = lit ? p.amber : p.raspberry;
    const pulse = .93 + .07*Math.sin(time*2.3);
    floor(disk,x,base+.021,z,1.34,1.34,alpha(halo,.36),{glow:1});
    floor(loop,x,base+.027,z,1.53,1.53,alpha(halo,lit ? .84 : .66),{glow:1});
    shadow(x,z,.80,.60,base);
    cyl(x,base+.13,z,.57,.14,.57,metal,{},stand);
    cyl(x,base+.27,z,.43,.09,.43,band,{},stand);
    cyl(x,base+.45,z,.20,.19,.20,metal,{},stem);
    cyl(x,base+.66,z,.48,.07,.48,band,{},stand);
    ellipsoid(x,base+1.12,z,.49,.54,.49,paper,{glow:lit ? pulse : .28});
    for (let side = 0; side < 8; side++) {
      const angle = side*radians/8;
      const radius = .467;
      cyl(x+Math.cos(angle)*radius,base+1.12,z+Math.sin(angle)*radius,.024,.35,.024,band,{glow:lit ? .42 : .03},stem);
    }
    cyl(x,base+1.63,z,.52,.07,.52,metal,{},stand);
    cyl(x,base+1.77,z,.57,.13,.57,band,{},stand);
    cyl(x,base+1.92,z,.23,.11,.23,metal,{},stand);
    ellipsoid(x,base+2.05,z,.115,.13,.115,lit ? p.litCore : p.offPaper,{glow:lit ? 1 : .31},bud);
    if (!lit) return;
    ellipsoid(x,base+1.17,z,.69,.62,.69,alpha(p.litCore,.18),{glow:1},bud);
    for (let i = 0; i < 5; i++) {
      const orbit = time*.71 + i*radians/5;
      ellipsoid(x+Math.cos(orbit)*(.57+i*.09), base+.96+i*.35+Math.sin(orbit*2)*.17,z+Math.sin(orbit)*(.57+i*.09),
        .041,.051,.041,p.light,{glow:1},bud);
    }
  }

  function firefly(item, time, index) {
    const { x } = item;
    const z = coordinate(item);
    const phase = time * 2.4 + index*1.8;
    const floorY = item.groundY ?? 0;
    const h = Math.max(floorY+.31, item.y ?? .58) + Math.sin(phase)*.11;
    floor(loop,x,floorY+.023,z,.47,.47,alpha(p.cream,.87),{glow:1});
    ellipsoid(x,h,z,.13,.13,.13,p.light,{glow:1},bud);
    ellipsoid(x,h,z,.24,.24,.24,alpha(p.moteHalo,.40),{glow:1},bud);
    ellipsoid(x-.12,h+.065,z,.12,.035,.085,alpha(p.white,.86),{yaw:phase,roll: .26*Math.sin(phase*9),glow:1},bud);
    ellipsoid(x+.12,h+.065,z,.12,.035,.085,alpha(p.white,.86),{yaw:phase,roll:-.26*Math.sin(phase*9),glow:1},bud);
    ellipsoid(x+.21*Math.cos(phase),h-.14,z+.21*Math.sin(phase),.035,.035,.035,p.cream,{glow:1},bud);
  }

  function shade(item, time, index) {
    const x = item.x;
    const z = coordinate(item);
    const base = item.y ?? 0;
    const y = base + Math.sin(time*3.7+index)*.105;
    const stunned = item.state === 'stunned' || (item.stunnedTicks ?? item.stunned_ticks ?? item.stun ?? 0) > 0;
    const color = stunned ? p.stunned : p.shade;
    shadow(x,z,.7,.52,base);
    floor(loop,x,base+.022,z,.83,.83,alpha(p.outline,.72),{glow:1});
    ellipsoid(x,.63+y,z,.60,.45,.52,p.outline,{glow:.95});
    ellipsoid(x,.68+y,z+.027,.57,.40,.49,color,{glow:.55});
    ellipsoid(x,.47+y,z+.04,.51,.30,.42,color);
    ellipsoid(x-.30,1.03+y,z-.05,.17,.34,.145,color,{roll:.33},bud);
    ellipsoid(x+.30,1.03+y,z-.05,.17,.34,.145,color,{roll:-.33},bud);
    ellipsoid(x-.17,.74+y,z+.435,.08,.055,.035,stunned ? p.drifter : p.outline,{glow:1},bud);
    ellipsoid(x+.17,.74+y,z+.435,.08,.055,.035,stunned ? p.drifter : p.outline,{glow:1},bud);
    for (let i = 0; i < 7; i++) {
      const wave = time*1.8 + i*radians/7;
      const distance = .57+(i%3)*.12;
      ellipsoid(x+distance*Math.cos(wave),.36+y+.16*Math.sin(wave*1.8),z+distance*Math.sin(wave),
        .10,.07,.10,alpha(p.plum,.47),{glow:.2},bud);
    }
  }

  function hero(player, time, cameraYaw) {
    const x = player.x;
    const z = coordinate(player);
    const moved = lastPoint ? Math.hypot(x-lastPoint.x,z-lastPoint.z) : 0;
    const stride = moved > .001 ? 1 : 0;
    travelTime += moved*8.9;
    const sway = .035 * Math.sin(time*3.6) + .067*stride*Math.abs(Math.sin(travelTime));
    const facing = lastPoint && moved > .001 ? Math.atan2(x-lastPoint.x,z-lastPoint.z) : lastPoint?.yaw;
    const yaw = Number.isFinite(player.dir) ? Math.PI - player.dir : facing ?? (Math.PI+cameraYaw);
    lastPoint = { x, z, yaw };
    const altitude = player.y ?? 0;
    const cs = Math.cos(yaw);
    const sn = Math.sin(yaw);
    function part(dx,dy,dz,rx,ry,rz,color,details,shape) {
      ellipsoid(x+cs*dx+sn*dz,altitude+dy+sway,z-sn*dx+cs*dz,rx,ry,rz,color,{...details,yaw:yaw+(details?.yaw ?? 0)},shape);
    }
    shadow(x,z,.61,.49,player.groundY ?? 0);
    floor(loop,x,.031,z,.67,.67,alpha(p.white,.71),{glow:1});
    part(0,.60,-.03,.37,.36,.25,p.coat,{glow:.68});
    part(0,.52,.178,.23,.25,.10,p.cream);
    for (const side of [-1,1]) {
      const step = stride*.11*Math.sin(travelTime)*side;
      part(.17*side,.20+Math.max(0,step*.53),step,.14,.16,.15,p.raspberry,{glow:.06});
      part(.17*side,.15+Math.max(0,step*.53),.105+step,.15,.105,.19,p.plum);
      part(.32*side,.59,-step,.108,.206,.119,p.coat,{roll: side*.21,glow:.35});
      part(.35*side,.455,-step+.04,.079,.083,.099,p.peach);
    }
    part(0,1.19,0,.48,.45,.39,p.coat,{glow:.62});
    part(0,1.17,.305,.357,.301,.166,p.cream,{glow:.28});
    part(0,1.40,.356,.292,.086,.125,p.raspberry,{roll:-.16,glow:.08});
    part(-.07,1.367,.435,.14,.064,.034,p.raspberry,{roll:-.4});
    for (const side of [-1,1]) {
      const blink = (time % 5) > 4.86 ? .014 : .061;
      part(.107*side,1.195,.451,.039,blink,.025,p.ink,{glow:.34},bud);
      part(.165*side,1.119,.438,.055,.031,.035,p.blush,{glow:.4},bud);
    }
    part(0,1.111,.472,.037,.018,.014,p.ember,{},bud);
    cyl(x,altitude+1.61+sway,z,.63,.024,.60,p.amber,{yaw},tube);
    cyl(x,altitude+1.76+sway,z,.62,.164,.59,p.cream,{yaw,glow:.23},hat);
    cyl(x,altitude+1.617+sway,z,.59,.017,.56,p.gold,{yaw,glow:.19},tube);
    // Mây's small lantern swings separately from the scarf at her hip.
    part(.39,.54,.10,.029,.15,.029,p.raspberry,{},stem);
    part(.39,.385,.10,.112,.13,.102,p.gold,{glow:1},bud);
    part(.39,.484,.10,.10,.040,.094,p.raspberry,{},stand);
    part(.39,.292,.10,.093,.034,.087,p.raspberry,{},stand);
    part(0,.831,-.07,.34,.093,.29,p.scarf,{glow:.55});
    part(.125,.71,-.32,.115,.18,.15,p.scarf,{roll:-.45,glow:.65});
    const ribbon = .07*Math.sin(time*4.8);
    part(.22,.613+ribbon,-.46,.10,.15,.14,p.scarf,{roll:-.5,glow:.65});
    part(.03,.59-ribbon,-.43,.089,.15,.13,p.scarf,{roll:.34,glow:.65});
  }

  function render(state, now = 0, options = {}) {
    const time = now/1000;
    const night = state.night ?? 1;
    const radius = night === 2 ? 28 : night === 3 ? 45 : 40;
    if (radius !== mapRadius) {
      mapRadius = radius;
      scenery = environment(radius);
    }
    const player = state.player ?? { x:0, z:0 };
    const yaw = state.viewYaw ?? (Math.PI + (state.cam_yaw_deg ?? state.camYaw ?? 0)*Math.PI/180);
    const x = player.x;
    const z = coordinate(player);
    const distance = state.cameraDistance ?? 8.9;
    const elevation = player.y ?? 0;
    const eye = [x+Math.sin(yaw)*distance, elevation+distance*.74, z+Math.cos(yaw)*distance];
    const target = [x-Math.sin(yaw)*3.75, elevation+1.02, z-Math.cos(yaw)*3.75];
    landscape(radius,time,night);
    for (const drift of state.drifters ?? []) {
      if (drift.state === 'removed') continue;
      const y = drift.y ?? -.2;
      const z = coordinate(drift);
      ellipsoid(drift.x,y,z,.32,.12,.49,alpha(p.drifter,.72),{glow:.83},bud);
      ellipsoid(drift.x,y,z,.12,.095,.76,alpha(p.drifter,.26),{glow:.87},bud);
    }
    for (const charm of state.charms ?? []) {
      if (charm.collected || charm.active === false || charm.available === false) continue;
      const y = (charm.y ?? 0)+.44;
      const z = coordinate(charm);
      const yaw = time*1.8;
      cyl(charm.x,y,z,.23,.26,.06,p.scarf,{yaw,glow:.76},stand);
      ellipsoid(charm.x,y+.27,z,.12,.052,.08,p.gold,{yaw,glow:1},bud);
      floor(loop,charm.x,y-.415,z,.52,.52,alpha(p.gold,.72),{glow:1});
    }
    if (state.wind?.active) {
      const theta = (state.wind.dir_deg ?? 0)*Math.PI/180;
      for (let i = 0; i < 28; i++) {
        const flow = (i*2.73+time*11)%40-20;
        const span = (i*7.39)%40-20;
        ellipsoid(x+Math.sin(theta)*flow+Math.cos(theta)*span, .83+i%4*.88,
          z+Math.cos(theta)*flow-Math.sin(theta)*span,.039,.039,.84,alpha(p.drifter,.47),
          {yaw:theta,glow:1},bud);
      }
    }

    for (const lanternItem of state.lanterns ?? []) lantern(lanternItem,time);
    for (const [index,item] of (state.fireflies ?? []).entries()) {
      if (!item.collected) firefly(item,time,index);
    }
    for (const [index,enemy] of (state.enemies ?? (state.enemy ? [state.enemy] : [])).entries()) {
      if (enemy.active !== false) shade(enemy,time,index);
    }

    hero(player,time,yaw);
    const latestPulse = state.events?.findLast((event) => ['pulse','light_pulse'].includes(event.name ?? event.kind));
    const pulseAge = (state.tick ?? 0) - (latestPulse?.tick ?? -99);
    if (pulseAge >= 0 && pulseAge < 24) {
      const spread = .8 + pulseAge*.22;
      floor(loop,x,(player.groundY ?? 0)+.048,z,spread,spread,alpha(p.gold,.76*(1-pulseAge/24)),{glow:1});
    }
    const lit = state.lanterns?.filter((item) => item.lit).length ?? 0;
    const ambient = .15 + .55 * lit / Math.max(1,state.lanterns?.length ?? 0);
    const style = { sky:p.sky.slice(0,3), horizon:p.fog.slice(0,3), sun:p.litCore.slice(0,3), fog:p.fog.slice(0,3), wave:p.drifter.slice(0,3), ambient };
    renderer.render(options.camera?.eye ?? eye, options.camera?.target ?? target, time, style);
  }

  return { render, project: renderer.project };
}
