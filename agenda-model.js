/* Informational monthly notes; no financial records or calculations. */
(() => {
  const uid = () => crypto.randomUUID();
  const field = (label, value = '') => ({id: uid(), label, value: String(value)});
  const block = (label, fields) => ({id: uid(), label, fields: fields.map(x => typeof x === 'string' ? field(x) : field(x[0], x[1]))});
  const receivable = label => ({id:uid(),label,fields:[{...field(''),amountSide:'label',paid:false}]});
  function emptyMonth() {
    return {order: ['Tarjeta 1', 'Tarjeta 2', 'Servicios'].map(label => ({id:uid(),label,paid:false})),
      receivables: [receivable('Persona')],
      debts: [block('Luz',['Importe','Notas']),block('Gas',['Importe','Notas']),block('Agua',['Importe','Notas']),block('Movistar',['Hogar','Celular','Mes anterior hogar','Mes anterior celular']),block('Gimnasio',['Importe']),block('Auto',['Importe','Notas']),block('Préstamos',['Importe','Notas'])],
      cards: [block('Tarjeta / crédito',['Vence','Cierra','Total','Mío','Ajeno','Mes anterior'])]};
  }
  function nextMonth(previous) {
    const result = structuredClone(previous);
    const name = x => x.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    result.order.forEach(item => item.paid = false);
    for (const group of ['receivables','debts','cards']) {
      result[group].forEach((item,index) => {
        const old = previous[group][index];
        if ('paid' in item) item.paid=false;
        for(const property of ['dueDate','homeDueDate','cellDueDate'])if(property in item)item[property]='';
        item.fields.forEach(f => {
          const label = name(f.label);
          if(['debts','receivables'].includes(group) && amountInLabel(f)){f.label='';f.amountSide='label';}
          f.value = '';
          if ('paid' in f) f.paid = false;
          if ('dueDate' in f) f.dueDate='';
          if (label.startsWith('mes anterior')) {
            const suffix = label.slice('mes anterior'.length).trim();
            const source = group==='cards'
              ? old.fields.find(x => name(x.label) === 'mio')
              : old.fields.find(x => name(x.label) === (suffix || 'total')) || (!suffix && old.fields.find(x => name(x.label) === 'importe'));
            f.value = source ? source.value : '';
          }
        });
      });
    }
    return result;
  }
  const amountInLabel=f=>f.amountSide==='label'||/^\s*\$?\s*\d[\d.,\s]*$/.test(f.label)||f.label.trim()===''||f.label==='Nuevo campo';
  function amountCents(value){
    let text=String(value??'').trim().toLowerCase().replace(/^(?:ars|\$)\s*/,'').replace(/\s/g,'');
    if(!text)return 0;
    const thousands=text.endsWith('mil');if(thousands)text=text.slice(0,-3);
    if(!/^-?\d[\d.,]*$/.test(text))return null;
    if(text.includes(',')&&text.includes('.')){const decimal=text.lastIndexOf(',')>text.lastIndexOf('.')?',':'.';text=text.replace(decimal===','?/\./g:/,/g,'').replace(decimal,'.');}
    else if(text.includes(',')){text=/^-?\d{1,3}(,\d{3})+$/.test(text)?text.replace(/,/g,''):text.replace(',','.');}
    else if(/^-?\d{1,3}(\.\d{3})+$/.test(text))text=text.replace(/\./g,'');
    const number=Number(text);return Number.isFinite(number)?Math.round(number*(thousands?1000:1)*100):null;
  }
  const amountOwner=(item,field)=>['Mío','Ajeno'].includes(field.owner)?field.owner:/pr[eé]stamos?\s+(?:ezequiel|exe|eze)\b/i.test(item.label)?'Ajeno':'Mío';
  function ownTotal(month){
    if(!month)return {amount:0,unreadable:0};
    const name=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    let cents=0,unreadable=0;
    const include=value=>{const parsed=amountCents(value);if(parsed===null)unreadable++;else cents+=parsed;};
    for(const item of month.debts){
      for(const f of item.fields){
        if(f.label==='Nuevo campo'&&!f.value.trim())continue;
        if(/^(?:notas?|cuotas?|vence|vencimiento|fecha|cierra|cierre|mes anterior|ajeno)\b/.test(name(f.label)))continue;
        if(amountOwner(item,f)==='Mío')include(amountInLabel(f)?f.label:f.value);
      }
    }
    for(const item of month.cards){const field=item.fields.find(f=>name(f.label)==='mio');if(field)include(field.value);}
    return {amount:cents/100,unreadable};
  }
  const validDate=x=>{if(x==='')return true;if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;const d=new Date(x+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;};
  const text = x => typeof x === 'string' && x.length <= 2000;
  function validMonth(m) {
    if (!m || !['order','receivables','debts','cards'].every(k=>Array.isArray(m[k]) && m[k].length<=200)) return false;
    const ids=new Set();const unique=id=>{if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||ids.has(id))return false;ids.add(id);return true;};
    return m.order.every(x=>x&&unique(x.id)&&text(x.label)&&typeof x.paid==='boolean') && ['receivables','debts','cards'].every(k=>m[k].every(x=>x&&unique(x.id)&&text(x.label)&&['dueDate','homeDueDate','cellDueDate'].every(property=>x[property]===undefined||validDate(x[property]))&&(x.paid===undefined||typeof x.paid==='boolean')&&Array.isArray(x.fields)&&x.fields.length<=50&&x.fields.every(f=>f&&unique(f.id)&&text(f.label)&&text(f.value)&&(f.detail===undefined||text(f.detail))&&(f.owner===undefined||['Mío','Ajeno'].includes(f.owner))&&(f.dueDate===undefined||validDate(f.dueDate))&&(f.paid===undefined||typeof f.paid==='boolean')&&(f.amountSide===undefined||f.amountSide==='label'))));
  }
  function validBook(b) {
    return b && b.version===1 && b.months && typeof b.months==='object' && !Array.isArray(b.months) && Object.keys(b.months).length<=500 && Object.entries(b.months).every(([key,m])=>/^\d{4}-(0[1-9]|1[0-2])$/.test(key)&&validMonth(m));
  }
  window.PaymentAgendaModel = {uid,field,block,receivable,emptyMonth,nextMonth,validMonth,validBook,amountInLabel,amountCents,amountOwner,ownTotal};
})();
