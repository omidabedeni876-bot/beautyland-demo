// Normalized, local-only image processors. No network or persistent storage.
export const services = ['mole','lift','hair','botox','filler'];
const customProcessors = new Map();
export function registerProcessor(id,processor){customProcessors.set(id,processor);}
export function mapPoint(clientX, clientY, rect, width, height) {
  const scale=Math.min(rect.width/width,rect.height/height), w=width*scale,h=height*scale;
  const x=(clientX-rect.left-(rect.width-w)/2)/w,y=(clientY-rect.top-(rect.height-h)/2)/h;
  return x<0||x>1||y<0||y>1?null:{x,y};
}
export function applyEffect(source, region) {
  if(customProcessors.has(region.service))return customProcessors.get(region.service)(source,region);
  const {width:w,height:h,data:src}=source;
  const out=new Uint8ClampedArray(src), cx=region.x*w,cy=region.y*h,r=Math.max(2,region.radius*Math.min(w,h));
  const strength=Math.max(0,Math.min(1,region.strength));
  const x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(w-1,Math.ceil(cx+r));
  const y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(h-1,Math.ceil(cy+r));
  const sample=(x,y,c)=>src[(Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x))))*4+c];
  let avg=[0,0,0], n=0;
  if(region.service==='mole') for(let a=0;a<Math.PI*2;a+=.08){for(let c=0;c<3;c++)avg[c]+=sample(cx+Math.cos(a)*r*1.12,cy+Math.sin(a)*r*1.12,c);n++;}
  if(n)avg=avg.map(v=>v/n);
  const angle=(region.angle??-90)*Math.PI/180;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const dx=(x-cx)/r,dy=(y-cy)/r,d=Math.hypot(dx,dy);if(d>=1)continue;
    const edge=Math.pow(1-d*d,2),i=(y*w+x)*4;
    for(let c=0;c<3;c++){
      let v=src[i+c];
      if(region.service==='mole'){
        const texture=sample(cx+Math.cos(Math.atan2(dy,dx))*r*1.1,cy+Math.sin(Math.atan2(dy,dx))*r*1.1,c);
        v=v*(1-edge*strength)+(avg[c]*.75+texture*.25)*edge*strength;
      } else if(region.service==='lift'){
        v=sample(x-Math.cos(angle)*r*.25*strength*edge,y-Math.sin(angle)*r*.25*strength*edge,c);
      } else if(region.service==='filler'){
        const scale=1-.28*strength*edge;v=sample(cx+(x-cx)*scale,cy+(y-cy)*scale,c);
      } else if(region.service==='botox'){
        let sum=0;const step=Math.max(1,Math.round(r*.045));
        for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++)sum+=sample(x+xx*step,y+yy*step,c);
        v=v*(1-edge*strength*.8)+(sum/25)*edge*strength*.8;
      }
      out[i+c]=v;
    }
  }
  return {width:w,height:h,data:out};
}
export function drawHair(ctx,region,w,h){
  const r=region.radius*Math.min(w,h),cx=region.x*w,cy=region.y*h;
  let seed=9283;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  ctx.save();ctx.strokeStyle=region.color||'#30251f';ctx.lineWidth=Math.max(.7,w/1600);
  for(let i=0;i<(region.density??.6)*1000;i++){
    const x=cx+(rand()*2-1)*r,y=cy+(rand()*2-1)*r*.58;
    const d=Math.hypot((x-cx)/r,(y-cy)/(r*.58));if(d>1)continue;
    ctx.globalAlpha=(1-d)*region.strength*.85;const len=r*(.08+rand()*.2);
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+len*.2,y-len*.65,x+len*.65,y-len);ctx.stroke();
  }ctx.restore();
}
