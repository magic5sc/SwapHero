import {startConfiguredGame} from './app.mjs';
import {PLAY_KEY,makePlaySnapshot} from './editor-model.mjs';
try{const saved=JSON.parse(localStorage.getItem(PLAY_KEY)||'null');if(!saved)throw Error('没有测试快照，请先在编辑器点击保存并试玩');startConfiguredGame(makePlaySnapshot(saved.catalog,saved.team));}catch(error){alert(error.message);}
