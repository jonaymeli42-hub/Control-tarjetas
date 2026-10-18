export const SHARED_PENDING_KEY='control-gastos-pending-expenses-v1';
export const pendingOperationId=id=>'audio_'+id;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function validPendingExpenses(book){
 if(!plain(book)||book.version!==1||!Array.isArray(book.notes)||book.notes.length>500||Object.keys(book).some(k=>!['version','notes'].includes(k)))return false;
 const ids=new Set();return book.notes.every(n=>{
  if(!plain(n)||Object.keys(n).some(k=>!['id','text','createdAt','date','nativeReceipt'].includes(k))||typeof n.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(n.id)||ids.has(n.id)||typeof n.text!=='string'||!n.text.trim()||n.text.length>1000||typeof n.createdAt!=='string'||!Number.isFinite(Date.parse(n.createdAt))||typeof n.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(n.date))return false;
  if(n.nativeReceipt!==undefined&&(typeof n.nativeReceipt!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(n.nativeReceipt)))return false;
  const date=new Date(n.date+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==n.date)return false;ids.add(n.id);return true;
 });
}
export function createPendingExpenseStore(storage,key){
 const read=()=>{const raw=storage.getItem(key);if(raw===null)return {version:1,notes:[]};const book=JSON.parse(raw);if(!validPendingExpenses(book))throw Error('No pude leer las notas pendientes. No se reemplazó ningún dato.');return book;};
 const write=book=>{if(!validPendingExpenses(book))throw Error('No se pudo guardar la nota pendiente. Revisá el texto o la cantidad de notas.');storage.setItem(key,JSON.stringify(book));return structuredClone(book);};
 return {read,upsert(note){const book=read(),i=book.notes.findIndex(n=>n.id===note.id);if(i<0)book.notes.push({...note});else book.notes[i]={...book.notes[i],text:note.text};return write(book);},remove(id){const book=read();book.notes=book.notes.filter(n=>n.id!==id);return write(book);},restore:write};
}
