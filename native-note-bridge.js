import {validPendingExpenses} from './pending-expenses.js?v=native-1';
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
 return `intent://registrado/${encodeURIComponent(note.id)}?token=${encodeURIComponent(note.nativeReceipt)}&app=${target}#Intent;scheme=anotargasto;package=com.controlfinanzas.anotargasto;end`;
}
export function showNativeReturn(note,target){
 const url=nativeReturnUrl(note,target);if(!url)return;
 document.getElementById('native-note-return')?.remove();
 const panel=document.createElement('aside');panel.id='native-note-return';panel.setAttribute('role','status');
 const message=document.createElement('p');message.textContent='✓ Gasto registrado. Volvé al anotador para que la nota salga de pendientes.';
 const back=document.createElement('a');back.href=url;back.textContent='Volver a Anotar gasto';
 const close=document.createElement('button');close.type='button';close.textContent='Cerrar';close.onclick=()=>panel.remove();panel.append(message,back,close);document.body.append(panel);
}
