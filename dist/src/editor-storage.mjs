import {normalizeDocument} from './content-package.mjs';
export const WORKSPACE='swaphero.editor.workspace',HISTORY='swaphero.editor.history',LEGACY='swaphero.editor.draft.v1',ORIGINAL='swaphero.editor.migration.v1.original';
export function loadWorkspace(storage){const raw=storage.getItem(WORKSPACE);if(raw){const record=JSON.parse(raw);if(record.storage_version!==1)throw Error('草稿存储版本不支持；原数据保留');return normalizeDocument(record.document);}
 const old=storage.getItem(LEGACY);if(!old)return null;const doc=normalizeDocument(JSON.parse(old));if(storage.getItem(ORIGINAL)===null)storage.setItem(ORIGINAL,old);storage.setItem(WORKSPACE,JSON.stringify({storage_version:1,document:doc,saved_at:new Date().toISOString(),migrated_from:LEGACY}));return doc;
}
export function saveWorkspace(storage,doc){normalizeDocument(doc);const old=storage.getItem(WORKSPACE);if(old){let history;try{history=JSON.parse(storage.getItem(HISTORY)||'[]');if(!Array.isArray(history))history=[];}catch{history=[];}if(history.at(-1)?.raw!==old){history.push({at:new Date().toISOString(),raw:old});storage.setItem(HISTORY,JSON.stringify(history.slice(-10)));}}
 storage.setItem(WORKSPACE,JSON.stringify({storage_version:1,document:structuredClone(doc),saved_at:new Date().toISOString()}));}
export function previousWorkspace(storage,index=null){const history=JSON.parse(storage.getItem(HISTORY)||'[]');if(!history.length)throw Error('没有可恢复的历史草稿');return normalizeDocument(JSON.parse((index===null?history.at(-1):history[index]).raw).document);}
