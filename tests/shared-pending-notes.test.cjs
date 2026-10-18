const test=require('node:test'),assert=require('node:assert/strict');
test('both app readers share the same local queue without changing timestamp or amount-bearing text',async()=>{
 const {createPendingExpenseStore,SHARED_PENDING_KEY,pendingOperationId}=await import('../pending-expenses.js');
 const data=new Map(),storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};
 const quickNotes=createPendingExpenseStore(storage,SHARED_PENDING_KEY),cards=createPendingExpenseStore(storage,SHARED_PENDING_KEY);
 const note={id:'shared-note',text:'Ropa, 3 cuotas de 10000',date:'2026-10-18',createdAt:'2026-10-18T18:30:00.000Z'};
 quickNotes.upsert(note);assert.deepEqual(cards.read().notes,[note]);assert.equal(pendingOperationId(note.id),'audio_shared-note');
 cards.remove(note.id);assert.equal(quickNotes.read().notes.length,0);
});
