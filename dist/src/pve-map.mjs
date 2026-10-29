// Project test baseline v1: 7 paths, 7 columns, retained 15/14/13 layers.
export function seeded(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(a,rng){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function generateMap(seed,layers=15){
 const rng=seeded(seed),nodes=new Map(),edges=[];
 const get=(row,col)=>{const id=`n${row}_${col}`;if(!nodes.has(id))nodes.set(id,{id,row,col,type:'combat',next:[]});return nodes.get(id);};
 for(let path=0;path<7;path++){
  let col=path;
  for(let row=0;row<layers-1;row++){
   const from=get(row,col);const possible=[col-1,col,col+1].filter(c=>c>=0&&c<7&&!edges.some(e=>e.row===row&&(e.a-col)*(e.b-c)<0));
   const dest=possible[Math.floor(rng()*possible.length)];const to=get(row+1,dest);
   if(!from.next.includes(to.id)){from.next.push(to.id);edges.push({row,a:col,b:dest});}col=dest;
  }
 }
 const list=[...nodes.values()];const last=list.filter(n=>n.row===layers-1);
 for(const n of last){n.type='camp';n.next=['boss'];}
 const quotas={elite:5,shop:3,event:10+Math.floor(rng()*5),camp:Math.max(0,6+Math.floor(rng()*2)-last.length)};
 for(const type of ['elite','shop','camp','event']){
  let count=0;
  for(const n of shuffle(list,rng)){
   if(count>=quotas[type])break;
   if(n.row===0||n.row===layers-1||n.type!=='combat'||(['elite','camp'].includes(type)&&n.row<5))continue;
   if(type!=='event'&&list.some(p=>(p.next.includes(n.id)||n.next.includes(p.id))&&p.type===type))continue;
   // Prefer distinct choices at forks, without violating hard adjacency rules.
   if(type!=='event'&&list.some(p=>p.next.includes(n.id)&&p.next.some(id=>nodes.get(id)?.type===type)))continue;
   n.type=type;count++;
  }
 }
 list.push({id:'boss',row:layers,col:3,type:'boss',next:[]});
 return {version:1,layers,nodes:list.sort((a,b)=>a.row-b.row||a.col-b.col),seed:String(seed)};
}
