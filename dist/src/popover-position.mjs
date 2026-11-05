export function popoverPosition(point,box,viewport,gap=12){
 const margin=8,x=point.x,y=point.y;
 const left=x+gap+box.width>viewport.width-margin?x-box.width-gap:x+gap;
 const top=y+gap+box.height>viewport.height-margin?y-box.height-gap:y+gap;
 return {left:Math.max(margin,Math.min(left,viewport.width-box.width-margin)),top:Math.max(margin,Math.min(top,viewport.height-box.height-margin))};
}
export function positionPopover(popup,event,anchor){
 const rect=anchor?.getBoundingClientRect();
 const point={x:Number.isFinite(event?.clientX)?event.clientX:rect?.left+rect?.width/2||8,y:Number.isFinite(event?.clientY)?event.clientY:rect?.bottom||8};
 const position=popoverPosition(point,popup.getBoundingClientRect(),{width:innerWidth,height:innerHeight});
 popup.style.left=position.left+'px';popup.style.top=position.top+'px';
}
