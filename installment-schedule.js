// Statement months can differ from the original consecutive-month estimate.
const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0,4))>=1900 && Number(value.slice(0,4))<=2200;
export const monthIndex = value => {if(!validMonth(value))throw Error('Revisá el mes elegido.');return Number(value.slice(0,4))*12+Number(value.slice(5))-1;};
const monthText = index => `${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;
export function installmentMonths(expense) {
 const count=Number(expense.installments),start=monthIndex(expense.start);
 const custom=expense.installmentMonths;
 if(Array.isArray(custom)&&custom.length===count&&custom.every((m,i)=>validMonth(m)&&(!i||m>custom[i-1])))return [...custom];
 return Array.from({length:count},(_,i)=>monthText(start+i));
}
export function moveInstallments(expense,number,target) {
 const months=installmentMonths(expense),i=Number(number)-1;
 if(!Number.isInteger(i)||i<0||i>=months.length)throw Error('Elegí una cuota válida.');
 const shift=monthIndex(target)-monthIndex(months[i]);
 const next=months.map((m,n)=>n<i?m:monthText(monthIndex(m)+shift));
 if(next.some((m,n)=>!validMonth(m)||(n&&m<=next[n-1])))throw Error('Ese mes se superpone con una cuota anterior. Elegí un mes posterior.');
 return {...expense,start:next[0],installmentMonths:next};
}
export function preserveSchedule(expense,changes) {
 if(!Array.isArray(expense.installmentMonths))return {...expense,...changes};
 const shift=monthIndex(changes.start)-monthIndex(expense.start);
 const months=installmentMonths(expense).map(m=>monthText(monthIndex(m)+shift)).slice(0,Number(changes.installments));
 while(months.length<Number(changes.installments))months.push(monthText(monthIndex(months.at(-1))+1));
 if(months.some(m=>!validMonth(m)))throw Error('Revisá las fechas del gasto.');
 return {...expense,...changes,installmentMonths:months};
}
