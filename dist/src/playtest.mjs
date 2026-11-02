import {previewLevel} from './pve.mjs';
import {mountLeather} from './tabletop.mjs';
import {startConfiguredGame,openAdventureBattle} from './app.mjs';
import {PLAY_KEY,makePlaySnapshot} from './editor-model.mjs';
try{if(new URLSearchParams(location.search).get('mode')==='level'){
 const data=JSON.parse(localStorage.getItem('swaphero.level.preview'));
 mountLeather(document.getElementById('battle-screen'));
 openAdventureBattle(previewLevel(data.pack,data.id),{onChange(){},onExit(){window.close();}});
 document.getElementById('back-home').textContent='结束试玩';
}else{const saved=JSON.parse(localStorage.getItem(PLAY_KEY)||'null');if(!saved)throw Error('没有测试快照，请先在编辑器点击保存并试玩');startConfiguredGame(makePlaySnapshot(saved.catalog,saved.team));}}catch(error){alert(error.message);}
