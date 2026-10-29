import type { RoomScene } from './roomScene';
export type Vec3 = [number, number, number];
export type Face = { points: Vec3[]; color: string };
export type Camera = { yaw: number; pitch: number; zoom: number };
export const defaultCamera: Camera = { yaw: Math.PI / 4, pitch: 0.55, zoom: 1 };
export function orbitCamera(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, yaw: camera.yaw + dx * 0.009, pitch: Math.max(0.18, Math.min(1.3, camera.pitch + dy * 0.006)) };
}
function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => Math.min(255, Math.round(v * factor)).toString(16).padStart(2, '0')).join('');
}
export function roomGeometry(scene: RoomScene, moving = false): Face[] {
  const faces: Face[] = [];
  let anchor: Vec3 = [0, 0, 0], angle = 0, size = 1;
  const face = (points: Vec3[], color: string) => faces.push({ color, points: points.map(([x,y,z]) => [anchor[0] + size * (x * Math.cos(angle) - z * Math.sin(angle)), anchor[1] + size * y, anchor[2] + size * (x * Math.sin(angle) + z * Math.cos(angle))]) });
  const box = (x:number,y:number,z:number,w:number,h:number,d:number,color:string) => {
    const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,t=y+h;
    face([[a,y,c],[b,y,c],[b,t,c],[a,t,c]],shade(color,0.8));
    face([[b,y,e],[a,y,e],[a,t,e],[b,t,e]],color);
    face([[a,y,e],[a,y,c],[a,t,c],[a,t,e]],shade(color,0.9));
    face([[b,y,c],[b,y,e],[b,t,e],[b,t,c]],shade(color,0.94));
    face([[a,t,c],[b,t,c],[b,t,e],[a,t,e]],shade(color,1.12));
  };
  const cylinder = (x:number,y:number,z:number,r:number,h:number,color:string,topRadius=r) => {
    const top:Vec3[]=[];
    const segments = moving ? 8 : 12;
    for(let i=0;i<segments;i++) {
      const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
      const p:Vec3=[x+topRadius*Math.cos(a),y+h,z+topRadius*Math.sin(a)]; top.push(p);
      face([[x+r*Math.cos(a),y,z+r*Math.sin(a)],[x+r*Math.cos(b),y,z+r*Math.sin(b)],[x+topRadius*Math.cos(b),y+h,z+topRadius*Math.sin(b)],p],shade(color,0.83+0.15*Math.cos(a)));
    }
    face(top,shade(color,1.1));
  };
  box(0,-0.18,0,6,0.18,6,scene.floor || '#B99170');
  for(let i=0;i<9;i++)box(-2.8+i*0.7,0.003,0,0.018,0.005,6,'#CFB190');
  // Open front, two full walls. Orbiting shows their real exterior surfaces.
  const columns = moving ? 4 : 12, rows = moving ? 2 : 4;
  for(let i=0;i<columns;i++)for(let j=0;j<rows;j++) {
    const a=-3+i*6/columns,b=a+6/columns,y=j*2.9/rows,t=y+2.9/rows,w=scene.wall || '#EBDDC5';
    for(const z of [-3.06,-2.94])face([[a,y,z],[b,y,z],[b,t,z],[a,t,z]],z < -3 ? shade(w,0.8) : w);
    for(const x of [-3.06,-2.94])face([[x,y,a],[x,y,b],[x,t,b],[x,t,a]],shade(w,x < -3 ? 0.88 : 0.95));
  }
  for(const x of [-2.95,0,2.95])box(x,0,-2.9,0.12,2.95,0.15,'#99704D');
  for(const z of [-2.95,0,2.95])box(-2.9,0,z,0.15,2.95,0.12,'#99704D');
  box(0,2.85,-2.9,6,0.13,0.18,'#99704D');box(-2.9,2.85,0,0.18,0.13,6,'#99704D');
  for(let i=0;i<8;i++) {
    cylinder(-2.4+i*0.65,2.67-Math.sin(i/7*Math.PI)*0.3,-2.76,0.048,0.07,'#FFE2A0');
  }
  for(const item of scene.decorations) {
    // Invert the isometric floor projection used by the saved 2D layout.
    const u=(item.x-0.5)*2.3, v=(item.y-0.70)*3.2;
    anchor=[Math.max(-2.4,Math.min(2.4,(u+v)*3)),0,Math.max(-2.4,Math.min(2.4,(-u+v)*3))];
    angle=(item.rotation||0)*Math.PI/2;size=item.scale||1;
    const k=item.kind, c=item.color||'#BB9674';
    if(k.startsWith('window')) {
      anchor=[Math.max(-1.9,Math.min(1.9,(item.x-0.5)*6)),1.1,-2.82];angle=0;
      box(0,0,0,1.2,1.15,0.12,c);box(0,0.1,0.08,1.02,0.95,0.06,'#BFD5CA');
      box(0,0.1,0.13,0.055,0.95,0.04,'#FFF2D6');box(0,0.55,0.13,1.04,0.05,0.04,'#FFF2D6');
      box(0,-0.05,0.12,1.4,0.1,0.3,c);
    } else if(k.startsWith('rug')) cylinder(0,0.015,0,1.4,0.01,c);
    else if(k.startsWith('bed')) {
      box(0,0.18,0,1.65,0.3,2.2,'#A8825E');box(0,0.48,0,1.6,0.23,2.13,'#FFF2D9');
      box(0,0.71,0.25,1.61,0.08,1.65,c);box(0,0.73,-0.72,1.08,0.16,0.42,'#FFF7E7');
      box(0,0.2,-1.1,1.72,1,0.12,c);
      if(k==='bed_canopy') { for(const x of [-0.82,0.82])for(const z of [-1.1,1.1])box(x,0,z,0.06,2.1,0.06,'#C4AA81');box(0,2.05,0,1.8,0.05,2.3,c); }
    } else if(k.startsWith('sofa')) {
      box(0,0.15,0,2,0.45,1,c);box(0,0.6,-0.4,2,0.85,0.25,c);
      for(const x of [-0.9,0.9])box(x,0.4,0.03,0.28,0.5,1,c);
      box(0,0.6,0.1,1.48,0.16,0.75,'#E4E4CC');box(-0.4,0.76,-0.15,0.45,0.42,0.2,'#F5E9D7');
    } else if(k.startsWith('table')) {
      cylinder(0,0.65,0,0.7,0.12,c);for(const x of [-0.4,0.4])for(const z of [-0.35,0.35])box(x,0,z,0.08,0.65,0.08,'#9D7855');
      cylinder(0.15,0.78,0,0.1,0.14,'#F5E8CD');
    } else if(k.startsWith('plant')) {
      cylinder(0,0,0,0.22,0.4,c,0.32);box(0,0.4,0,0.04,0.7,0.04,'#78865B');
      for(let i=0;i<5;i++){const a=i*2.4;cylinder(Math.cos(a)*0.22,0.55+i*0.12,Math.sin(a)*0.18,0.05,0.22,'#9BAB7D',0.19);}
      if(k==='plant_flower')for(let i=0;i<3;i++)cylinder((i-1)*0.18,1.05,0,0.12,0.08,'#EAC5A2');
    } else if(k.startsWith('lamp')) {
      cylinder(0,0,0,0.28,0.08,'#B49A72');cylinder(0,0.08,0,0.07,0.72,'#CCAF85');
      cylinder(0,0.8,0,0.48,0.3,c,0.12);cylinder(0,0.76,0,0.36,0.04,'#FFE0A3');
    } else if(k.startsWith('shelf')) {
      for(const x of [-0.55,0.55])box(x,0,0,0.1,1.65,0.45,c);
      for(const y of [0.1,0.65,1.2,1.65])box(0,y,0,1.2,0.08,0.45,c);
      for(let i=0;i<5;i++)box(-0.4+i*0.17,0.73,0,0.12,0.35,0.26,i%2?'#9EAF8C':'#D2B592');
    } else { cylinder(0,0,0,0.25,0.4,c,0.2);cylinder(0,0.4,0,0.23,0.25,c,0.18); }
  }
  return faces;
}
export function projectRoom(faces: Face[], camera: Camera, width: number, height: number) {
  const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const scale=Math.min(width,height)*0.092*camera.zoom;
  return faces.map((face,index)=>{
    const points=face.points.map(([x,y,z])=>{
      const rx=x*cy-z*sy, depth=x*sy+z*cy, ry=(y-1)*cp-depth*sp;
      return [width/2+rx*scale,height*0.53-ry*scale,depth*cp+(y-1)*sp];
    });
    return { key:index, color:face.color, depth:points.reduce((sum,p)=>sum+p[2],0)/points.length, points:points.map(p=>`${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') };
  }).sort((a,b)=>a.depth-b.depth);
}
