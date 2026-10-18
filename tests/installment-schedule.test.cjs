const test=require('node:test'),assert=require('node:assert/strict');
const model=()=>import('../installment-schedule.js');
const expense={id:'test',description:'LUT de prueba',start:'2026-09',installments:3,monthly:1234.56,card:'VISA prueba',responsible:'Mío'};
test('moving 2/3 from October to November moves 3/3 to December and retains first installment',async()=>{
 const {moveInstallments,installmentMonths}=await model();const next=moveInstallments(expense,2,'2026-11');
 assert.deepEqual(installmentMonths(next),['2026-09','2026-11','2026-12']);
 assert.equal(next.monthly,1234.56);assert.equal(next.installments,3);assert.equal(next.start,'2026-09');
 assert.equal(next.card,expense.card);assert.equal(expense.installmentMonths,undefined);
 assert.equal(installmentMonths(next).filter(m=>m==='2026-10').length,0);
 assert.equal(installmentMonths(next).filter(m=>m>'2026-10').length,2);
 assert.equal(installmentMonths(next).length*next.monthly,expense.installments*expense.monthly);
 assert.deepEqual(installmentMonths(JSON.parse(JSON.stringify(next))),installmentMonths(next));
});
test('repeated shifts preserve gaps and can undo an accidental move',async()=>{
 const {moveInstallments,installmentMonths}=await model();const moved=moveInstallments(expense,2,'2026-11');
 assert.deepEqual(installmentMonths(moveInstallments(moved,2,'2026-10')),['2026-09','2026-10','2026-11']);
 assert.deepEqual(installmentMonths(moveInstallments(moved,1,'2026-10')),['2026-10','2026-12','2027-01']);
});
test('rejects collisions with previous installments and malformed months',async()=>{
 const {moveInstallments}=await model();for(const [n,m] of [[2,'2026-09'],[2,'2026-08'],[0,'2026-11'],[4,'2026-11'],[2,'2026-13']])assert.throws(()=>moveInstallments(expense,n,m));
});
test('editing amount and installment count keeps adjusted months, new months extend from last',async()=>{
 const {moveInstallments,preserveSchedule,installmentMonths}=await model();const moved=moveInstallments(expense,2,'2026-11');
 const next=preserveSchedule(moved,{start:expense.start,installments:4,monthly:999});
 assert.deepEqual(installmentMonths(next),['2026-09','2026-11','2026-12','2027-01']);
 assert.equal(next.monthly,999);
 assert.deepEqual(installmentMonths(preserveSchedule(moved,{start:'2026-10',installments:3})),['2026-10','2026-12','2027-01']);
});
