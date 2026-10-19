import {validPendingExpenses} from './pending-expenses.js?v=silent-1';
export function parseNativeNote(hash){
 if(!String(hash).startsWith('#anotar='))return null;
 if(hash.length>15000)throw Error('La nota es demasiado larga.');
 let note;try{note=JSON.parse(decodeURIComponent(hash.slice(8)));}catch{throw Error('No pude leer la nota del anotador.');}
 if(!validPendingExpenses({version:1,notes:[note]})||!note.id.startsWith('android_')||typeof note.nativeReceipt!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(note.nativeReceipt))throw Error('La nota del anotador no es válida.');
 return note;
}
export function consumeNativeNote(store,location,history){
 if(!String(location.hash).startsWith('#anotar='))return null;
 const hash=location.hash,url=new URL(location.href);url.hash='';history.replaceState(null,'',url);
 const note=parseNativeNote(hash),existing=store.read().notes.find(n=>n.id===note.id);
 if(existing&&existing.nativeReceipt!==note.nativeReceipt)throw Error('Ya existe una nota con otro identificador de regreso.');
 store.upsert(note);return note;
}
export function nativeReturnUrl(note,target){
 if(!note||typeof note.nativeReceipt!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(note.nativeReceipt)||!/^android_[A-Za-z0-9_-]+$/.test(note.id))return null;
 if(!['gastos','tarjetas'].includes(target))return null;
 const silent=note.nativeCompletion==='silent-v1';
 const fallback='https://jonaymeli42-hub.github.io/'+(target==='gastos'?'Control-gastos/instalar.html':'Control-tarjetas/index.html');
 return `intent://${silent?'registrado-silencioso':'registrado'}/${encodeURIComponent(note.id)}?token=${encodeURIComponent(note.nativeReceipt)}&app=${target}#Intent;scheme=anotargasto;package=com.controlfinanzas.anotargasto;${silent?'launchFlags=0x10010000;S.browser_fallback_url='+encodeURIComponent(fallback)+';':''}end`;
}
export const NATIVE_COMPLETION_KEY='control-native-completions-v1';
export function createNativeCompletionQueue(storage){
 const read=()=>{const raw=storage.getItem(NATIVE_COMPLETION_KEY);if(raw===null)return [];const rows=JSON.parse(raw);if(!Array.isArray(rows)||rows.length>500||rows.some(row=>!row||Object.keys(row).some(key=>!['id','nativeReceipt','target'].includes(key))||!nativeReturnUrl({...row,nativeCompletion:'silent-v1'},row.target)))throw Error('No pude leer las confirmaciones pendientes.');return rows;};
 const write=rows=>storage.setItem(NATIVE_COMPLETION_KEY,JSON.stringify(rows));
 return {read,enqueue(note,target){if(note?.nativeCompletion!=='silent-v1'||!nativeReturnUrl(note,target))throw Error('Confirmación no válida.');const rows=read(),row={id:note.id,nativeReceipt:note.nativeReceipt,target};const i=rows.findIndex(item=>item.id===row.id);if(i<0){if(rows.length>=500)throw Error('Hay demasiadas confirmaciones pendientes.');rows.push(row);}else rows[i]=row;write(rows);},flush({active,navigate}){if(!active)return false;const rows=read(),row=rows[0];if(!row)return false;navigate(nativeReturnUrl({...row,nativeCompletion:'silent-v1'},row.target));write(rows.slice(1));return true;}};
}
let completionQueue;
function flushNativeCompletion(){try{return completionQueue?.flush({active:!navigator.userActivation||navigator.userActivation.isActive,navigate:url=>window.location.assign(url)});}catch{return false;}}
function installCompletionQueue(){if(completionQueue)return;completionQueue=createNativeCompletionQueue(localStorage);document.addEventListener('click',event=>{if(event.isTrusted)flushNativeCompletion();},true);}
if(typeof document!=='undefined'){try{installCompletionQueue();}catch{}}
export function showNativeReturn(note,target){
 const url=nativeReturnUrl(note,target);if(!url)return;
 document.getElementById('native-note-return')?.remove();
 if(note.nativeCompletion==='silent-v1'){
  try{installCompletionQueue();completionQueue.enqueue(note,target);flushNativeCompletion();return;}catch{}
 }
 const panel=document.createElement('aside');panel.id='native-note-return';panel.setAttribute('role','status');
 const message=document.createElement('p');message.textContent=note.nativeCompletion==='silent-v1'?'✓ Gasto registrado. Falta confirmar la nota.':'✓ Gasto registrado. Volvé al anotador para que la nota salga de pendientes.';
 const back=document.createElement('a');back.href=url;back.textContent=note.nativeCompletion==='silent-v1'?'Confirmar nota':'Volver a Anotar gasto';
 const close=document.createElement('button');close.type='button';close.textContent='Cerrar';close.onclick=()=>panel.remove();panel.append(message,back,close);document.body.append(panel);
}
