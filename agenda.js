(() => {
  'use strict';
  const M=window.PaymentAgendaModel, KEY='control-tarjetas-agenda-v1';
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  let selected=monthKey(new Date()), book={version:1,months:{}}, storageError=false, draft=null, dirty=false, orderOpen=false;
  try {const raw=localStorage.getItem(KEY);if(raw){const value=JSON.parse(raw);if(!M.validBook(value))throw Error();book=value;}} catch {storageError=true;}
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog=document.createElement('dialog');dialog.className='payment-agenda';dialog.id='payment-agenda';document.body.append(dialog);
  const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;document.body.append(file);
  const title=key=>new Date(Number(key.slice(0,4)),Number(key.slice(5))-1,1).toLocaleDateString('es-AR',{month:'long',year:'numeric'});
  const status=text=>{const node=dialog.querySelector('[data-agenda-status]');if(node)node.textContent=text;};
  function save(candidate) {
    if(storageError){status('No se pudo leer la planilla guardada. Exportá tus datos antes de intentar reemplazarla.');return false;}
    if(!M.validBook(candidate)){status('Revisá los campos de la planilla.');return false;}
    try {localStorage.setItem(KEY,JSON.stringify(candidate));book=candidate;status('Planilla guardada en este dispositivo.');window.DriveBackup?.changed();return true;}
    catch {status('No se pudo guardar. Revisá el espacio del dispositivo y exportá la planilla.');return false;}
  }
  const mutate=fn=>{const next=structuredClone(draft||book);if(!next.months[selected])next.months[selected]=M.emptyMonth();fn(next.months[selected]);if(draft){draft=next;dirty=true;status('Cambios sin guardar. Tocá Guardar planilla.');return true;}return save(next);};
  function leaveEdit(){if(draft && dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos?'))return false;draft=null;dirty=false;return true;}
  function tools(group,id,index,total){return `<div class="agenda-tools"><button type="button" data-agenda-action="up" data-group="${group}" data-id="${id}" ${index===0?'disabled':''} aria-label="Mover hacia arriba">↑</button><button type="button" data-agenda-action="down" data-group="${group}" data-id="${id}" ${index===total-1?'disabled':''} aria-label="Mover hacia abajo">↓</button>${draft?`<button type="button" data-agenda-action="remove" data-group="${group}" data-id="${id}" aria-label="Eliminar concepto">Eliminar</button>`:''}</div>`;}
  const serviceAmount=(group,item,f)=>(group==='receivables'||group==='debts' && /luz|gas|agua|movistar|servicio/i.test(item.label)) && (M.amountInLabel(f)||/^(importe|total|hogar|celular|monto)$/i.test(f.label.trim()));
  const isPaid=f=>f.paid??(M.amountInLabel(f)&&/^(pagado|cobrado|recibido)$/i.test(f.value?.trim()||''));
  function paidButton(group,item,field){const value=field||item,paid=field?isPaid(field):!!item.paid,word=group==='receivables'?'Cobrado':'Pagado';return `<button type="button" class="agenda-paid ${paid?'is-paid':''}" data-agenda-action="toggle-paid" data-group="${group}" data-id="${item.id}" ${field?`data-field="${field.id}"`:''} aria-pressed="${!!paid}" aria-label="${escape(item.label)}${field?' · '+escape(field.label):''}: ${paid?word+', volver a pendiente':'marcar como '+word.toLowerCase()}">${paid?'✓ '+word:'✓'}</button>`;}
  function amountRow(group,item,f){const property=M.amountInLabel(f)?'label':'value',amount=f[property];return `<div class="agenda-service-payment">${draft?`<input aria-label="Monto de ${escape(item.label)}" inputmode="decimal" data-group="${group}" data-id="${item.id}" data-field="${f.id}" data-property="${property}" maxlength="2000" value="${escape(amount)}">`:`<span class="agenda-service-amount">${escape(amount)||'—'}</span>`}${paidButton(group,item,f)}${draft?`<button type="button" data-agenda-action="remove-field" data-group="${group}" data-id="${item.id}" data-field="${f.id}" aria-label="Eliminar pago">×</button>`:''}</div>`;}
  const remainingField=(group,item,f)=>group==='debts'&&!serviceAmount(group,item,f)&&!/^(notas?|cuota|vence|cierra|cierre|mes anterior)/i.test(f.label.trim());
  function fieldPayment(group,item,f){return remainingField(group,item,f)?paidButton(group,item,f):'';}
  function blocks(group,items){
    if(!draft)return items.map(item=>`<article class="agenda-block agenda-read"><div class="agenda-payment-heading"><h4>${escape(item.label)}</h4>${group==='cards'?paidButton(group,item):''}</div><dl>${item.fields.map(f=>serviceAmount(group,item,f)?`${/hogar|celular/i.test(f.label)?`<small>${escape(f.label)}</small>`:''}${amountRow(group,item,f)}`:`<div><dt>${escape(f.label)}</dt><dd class="agenda-value-payment"><span>${f.value?escape(f.value):'—'}</span>${fieldPayment(group,item,f)}</dd></div>`).join('')}</dl></article>`).join('');
    return items.map((item,i)=>`<article class="agenda-block"><div class="agenda-block-head"><input aria-label="Título del concepto" data-group="${group}" data-id="${item.id}" data-property="label" maxlength="2000" value="${escape(item.label)}">${tools(group,item.id,i,items.length)}${group==='cards'?paidButton(group,item):''}</div><div class="agenda-fields">${item.fields.map(f=>serviceAmount(group,item,f)?`${/hogar|celular/i.test(f.label)?`<small>${escape(f.label)}</small>`:''}${amountRow(group,item,f)}`:`<div class="agenda-field ${remainingField(group,item,f)?'with-payment':''}"><input aria-label="Nombre del campo" data-group="${group}" data-id="${item.id}" data-field="${f.id}" data-property="label" maxlength="2000" value="${escape(f.label)}"><input aria-label="${escape(f.label)}: valor" data-group="${group}" data-id="${item.id}" data-field="${f.id}" data-property="value" maxlength="2000" value="${escape(f.value)}" placeholder="Anotar…">${fieldPayment(group,item,f)}<button type="button" data-agenda-action="remove-field" data-group="${group}" data-id="${item.id}" data-field="${f.id}" aria-label="Eliminar campo">×</button></div>`).join('')}</div><button type="button" data-agenda-action="add-field" data-group="${group}" data-id="${item.id}">+ Campo</button></article>`).join('');
  }
  function moreOptions(hasMonth){return `<details class="agenda-more"><summary aria-label="Más opciones de la planilla" title="Más opciones">⋮</summary><div class="agenda-more-options">${hasMonth?'<button type="button" data-agenda-action="roll-forward">Preparar mes siguiente</button>':''}<button type="button" data-agenda-action="import">Importar planilla</button><button type="button" data-agenda-action="export">Exportar planilla</button></div></details>`;}
  function render(){
    const m=(draft||book).months[selected];
    dialog.innerHTML=`<div class="agenda-header"><div><h2>Agenda de pagos</h2><p>Planilla informativa · No modifica saldos ni movimientos.</p></div><button type="button" data-agenda-action="close" aria-label="Cerrar planilla">×</button></div><div class="agenda-month"><button type="button" data-agenda-action="prev" aria-label="Mes anterior">‹</button><label>${escape(title(selected))}<input aria-label="Mes de la planilla" type="month" id="agenda-month" value="${selected}"></label><button type="button" data-agenda-action="next" aria-label="Mes siguiente">›</button></div><p data-agenda-status role="status">${storageError?'No se pudo leer la planilla guardada.':draft?'Editando · Tocá Guardar planilla para conservar los cambios.':m?'Planilla de este mes guardada.':'Este mes todavía no tiene una planilla.'}</p><div class="agenda-editbar">${draft?'<button type="button" class="primary" data-agenda-action="save-edits">Guardar planilla</button><button type="button" data-agenda-action="cancel-edit">Cancelar</button>':m?'<button type="button" data-agenda-action="edit">Editar planilla</button>':''}${!draft?moreOptions(!!m):''}</div>${draft?'<p class="hint">Si preparaste un mes nuevo: campos actuales vacíos y “Mes anterior” tomado de los importes del mes anterior. Revisá y guardá la planilla.</p>':''}${!m?'<button type="button" class="primary" data-agenda-action="create">Crear planilla de este mes</button>':`<button type="button" class="agenda-order-entry" data-agenda-action="open-order" aria-expanded="${orderOpen}" aria-controls="agenda-main">${orderOpen?'← Volver a la planilla':'Orden de pago →'}</button><div id="agenda-main" class="agenda-main ${orderOpen?'show-order':''}"><section><h3>Orden de pago</h3><p class="hint">Mové los conceptos con ↑ ↓. ${draft?'Los cambios se conservan al guardar.':'El orden y las marcas se guardan al cambiarlos.'}</p>${m.order.map((item,i)=>`<div class="agenda-order"><input type="checkbox" aria-label="${escape(item.label)}: pagado" data-group="order" data-id="${item.id}" data-property="paid" ${item.paid?'checked':''}>${draft?`<input aria-label="Concepto del orden de pago" data-group="order" data-id="${item.id}" data-property="label" maxlength="2000" value="${escape(item.label)}">`:`<span class="agenda-order-label">${escape(item.label)}</span>`}${tools('order',item.id,i,m.order.length)}</div>`).join('')}${draft?'<button type="button" data-agenda-action="add" data-group="order">+ Concepto</button>':''}</section><section><h3>Me deben</h3>${blocks('receivables',m.receivables)}${draft?'<button type="button" data-agenda-action="add" data-group="receivables">+ Persona / ingreso esperado</button>':''}</section><section><h3>Debo · Servicios y otros</h3>${blocks('debts',m.debts)}${draft?'<button type="button" data-agenda-action="add" data-group="debts">+ Servicio / concepto</button>':''}</section><section><h3>Tarjetas y créditos</h3>${blocks('cards',m.cards)}${draft?'<button type="button" data-agenda-action="add" data-group="cards">+ Tarjeta / crédito</button>':''}</section></div>`}`;
  }
  function exportFile(){const blob=new Blob([JSON.stringify({format:'tarjetas-agenda',...book},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='agenda-pagos.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  dialog.addEventListener('input',event=>{
    const input=event.target;if(!input.dataset.group)return;
    mutate(m=>{const item=m[input.dataset.group].find(x=>x.id===input.dataset.id);if(!item)return;const target=input.dataset.field?item.fields.find(f=>f.id===input.dataset.field):item;target[input.dataset.property]=input.type==='checkbox'?input.checked:input.value;});
  });
  dialog.addEventListener('change',event=>{if(event.target.id==='agenda-month'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)){if(!leaveEdit()){event.target.value=selected;return;}selected=event.target.value;orderOpen=false;render();dialog.scrollTop=0;}});
  dialog.addEventListener('click',event=>{
    const b=event.target.closest('[data-agenda-action]');if(!b)return;
    const action=b.dataset.agendaAction, group=b.dataset.group;
    dialog.querySelector('.agenda-more')?.removeAttribute('open');
    if(action==='open-order'){orderOpen=!orderOpen;render();dialog.scrollTop=0;return;}
    if(action==='toggle-paid'){
      const item=(draft||book).months[selected]?.[group]?.find(x=>x.id===b.dataset.id);
      const target=b.dataset.field?item?.fields.find(f=>f.id===b.dataset.field):item;
      if(!target)return;
      if(!confirm(`${isPaid(target)?'Volver a marcar como pendiente':group==='receivables'?'Confirmar como cobrado':'Confirmar como pagado'}: ${item.label}${b.dataset.field?' · '+target.label:''}. ¿Continuar?`))return;
      const position=dialog.scrollTop;
      if(mutate(m=>{const next=m[group].find(x=>x.id===b.dataset.id);const value=b.dataset.field?next.fields.find(f=>f.id===b.dataset.field):next;value.paid=!isPaid(target);})){render();dialog.scrollTop=position;}return;
    }
    if(action==='close'){if(leaveEdit())dialog.close();return;}
    if(action==='edit'){draft=structuredClone(book);dirty=false;render();return;}
    if(action==='cancel-edit'){if(leaveEdit())render();return;}
    if(action==='save-edits'){if(save(draft)){draft=null;dirty=false;render();status('Planilla guardada.');}return;}
    if(action==='prev'||action==='next'){if(!leaveEdit())return;const d=new Date(Number(selected.slice(0,4)),Number(selected.slice(5))-1+(action==='next'?1:-1),1);selected=monthKey(d);orderOpen=false;render();dialog.scrollTop=0;return;}
    if(action==='import'){if(!leaveEdit())return;render();file.value='';file.click();return;}
    if(action==='export'){exportFile();return;}
    if(action==='roll-forward'){
      if(!leaveEdit())return;
      const target=monthKey(new Date(Number(selected.slice(0,4)),Number(selected.slice(5)),1));
      const d=new Date(Number(target.slice(0,4)),Number(target.slice(5))-2,1),previous=book.months[monthKey(d)];
      if(!previous){status('No hay planilla guardada en el mes anterior.');return;}
      if(book.months[target] && !confirm('Este mes ya tiene una planilla. Al guardar se reemplazará por la nueva estructura. ¿Continuar?'))return;
      selected=target;orderOpen=false;draft=structuredClone(book);draft.months[selected]=M.nextMonth(previous);dirty=true;render();dialog.scrollTop=0;return;
    }
    if(action==='create'){draft=structuredClone(book);draft.months[selected]=M.emptyMonth();dirty=true;render();return;}
    if(action==='remove'||action==='remove-field'){if(!confirm('¿Eliminar esta anotación de la planilla de este mes?'))return;}
    const ok=mutate(m=>{
      if(action==='add'){m[group].push(group==='order'?{id:M.uid(),label:'Nuevo concepto',paid:false}:group==='receivables'?M.receivable('Nueva persona / ingreso'):M.block('Nuevo concepto',group==='cards'?['Vence','Cierra','Total','Mío','Ajeno','Mes anterior']:['Importe','Notas']));return;}
      const index=m[group].findIndex(x=>x.id===b.dataset.id);if(index<0)return;
      if(action==='remove')m[group].splice(index,1);
      if(action==='up'||action==='down'){const other=index+(action==='up'?-1:1);if(other>=0&&other<m[group].length)[m[group][index],m[group][other]]=[m[group][other],m[group][index]];}
      if(action==='add-field'){const item=m[group][index];item.fields.push((group==='receivables'||group==='debts'&&/luz|gas|agua|movistar|servicio/i.test(item.label))?{...M.field(''),amountSide:'label',paid:false}:M.field('Nuevo campo'));}
      if(action==='remove-field')m[group][index].fields=m[group][index].fields.filter(f=>f.id!==b.dataset.field);
    });if(ok)render();
  });
  function importBook(raw) {
    const incoming=raw.data?.paymentAgenda||raw.paymentAgenda||raw;
    if(!M.validBook(incoming))throw Error('El archivo no contiene una planilla válida.');
    const conflicts=Object.keys(incoming.months).filter(k=>book.months[k]);
    if(!confirm(`Importar ${Object.keys(incoming.months).length} mes(es) de planilla${conflicts.length?'; reemplazará las anotaciones de '+conflicts.join(', '):''}. No cambia los datos financieros. ¿Continuar?`))return;
    const next={version:1,months:{...book.months,...incoming.months}};
    if(save(next)){selected=Object.keys(incoming.months).sort().at(-1)||selected;render();status('Planilla importada.');}
  }
  file.addEventListener('change',async()=>{
    if(!file.files[0])return;
    try {importBook(JSON.parse(await file.files[0].text()));}
    catch(error){status(error.message||'No se pudo importar la planilla.');}
  });
  async function loadPrivateTemplate() {
    const encoded=new URLSearchParams(location.hash.slice(1)).get('agenda');
    if(!encoded)return;
    if(!leaveEdit())return;
    history.replaceState(null,'',location.pathname+location.search);
    render();if(!dialog.open)dialog.showModal();
    try {
      if(encoded.length>30000)throw Error('La plantilla es demasiado grande.');
      const bytes=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      importBook(JSON.parse(await new Response(stream).text()));
    } catch(error){status(error.message||'No se pudo cargar la plantilla.');}
  }
  document.getElementById('open-payment-agenda').addEventListener('click',()=>{orderOpen=false;render();dialog.showModal();dialog.scrollTop=0;});
  dialog.addEventListener('cancel',event=>{if(!leaveEdit())event.preventDefault();});
  window.addEventListener('beforeunload',event=>{if(draft && dirty){event.preventDefault();event.returnValue='';}});
  window.PaymentAgenda={exportData:()=>structuredClone(book)};
  window.addEventListener('hashchange',loadPrivateTemplate);
  loadPrivateTemplate();
})();
