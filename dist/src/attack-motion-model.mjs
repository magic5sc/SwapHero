// Pure preview geometry. No battle state, targeting rules or persistent storage.
export const duration=1.2;
export const hitTime=.48;
export const routes={straight:{from:0,to:0,label:'对位 · 直线'},near:{from:0,to:1,label:'相邻 · 斜向'},far:{from:0,to:2,label:'最远 · 对角'}};
export function sample(t){t=Math.max(0,Math.min(duration,t));let travel=0;if(t>=.18&&t<hitTime)travel=((t-.18)/(.3))**2;else if(t>=hitTime&&t<.56)travel=1;else if(t>=.56&&t<.94)travel=(1-(t-.56)/.38)**2;return {travel,hit:t>=hitTime,recoil:t>=hitTime&&t<.73?Math.sin((t-hitTime)/.25*Math.PI):0,flash:t>=hitTime&&t<.65?1-(t-hitTime)/.17:0,phase:t<.18?'锁定目标':t<hitTime?'出击':t<.56?'命中':t<.94?'归位':'结束'};}
export function displacement(from,to,mode,cardHeight=120){const dx=to.x-from.x,dy=to.y-from.y,d=Math.hypot(dx,dy);if(!d)return {x:0,y:0};const distance=mode==='card'?Math.max(0,d-cardHeight*.42):Math.min(80,d*.32);return {x:dx/d*distance,y:dy/d*distance};}
