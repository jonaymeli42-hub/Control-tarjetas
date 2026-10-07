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
        item.fields.forEach(f => {
          const label = name(f.label);
          if(['debts','receivables'].includes(group) && amountInLabel(f)){f.label='';f.amountSide='label';}
          f.value = '';
          if ('paid' in f) f.paid = false;
          if (label.startsWith('mes anterior')) {
            const suffix = label.slice('mes anterior'.length).trim();
            const source = old.fields.find(x => name(x.label) === (suffix || 'total')) || (!suffix && old.fields.find(x => name(x.label) === 'importe'));
            f.value = source ? source.value : '';
          }
        });
      });
    }
    return result;
  }
  const amountInLabel=f=>f.amountSide==='label'||/^\s*\$?\s*\d[\d.,\s]*$/.test(f.label)||f.label.trim()===''||f.label==='Nuevo campo';
  const text = x => typeof x === 'string' && x.length <= 2000;
  function validMonth(m) {
    if (!m || !['order','receivables','debts','cards'].every(k=>Array.isArray(m[k]) && m[k].length<=200)) return false;
    const ids=new Set();const unique=id=>{if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||ids.has(id))return false;ids.add(id);return true;};
    return m.order.every(x=>x&&unique(x.id)&&text(x.label)&&typeof x.paid==='boolean') && ['receivables','debts','cards'].every(k=>m[k].every(x=>x&&unique(x.id)&&text(x.label)&&(x.paid===undefined||typeof x.paid==='boolean')&&Array.isArray(x.fields)&&x.fields.length<=50&&x.fields.every(f=>f&&unique(f.id)&&text(f.label)&&text(f.value)&&(f.paid===undefined||typeof f.paid==='boolean')&&(f.amountSide===undefined||f.amountSide==='label'))));
  }
  function validBook(b) {
    return b && b.version===1 && b.months && typeof b.months==='object' && !Array.isArray(b.months) && Object.keys(b.months).length<=500 && Object.entries(b.months).every(([key,m])=>/^\d{4}-(0[1-9]|1[0-2])$/.test(key)&&validMonth(m));
  }
  window.PaymentAgendaModel = {uid,field,block,receivable,emptyMonth,nextMonth,validMonth,validBook,amountInLabel};
})();
