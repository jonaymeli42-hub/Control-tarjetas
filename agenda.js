(() => {
  'use strict';
  const M=window.PaymentAgendaModel, KEY='control-tarjetas-agenda-v1';
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  let selected=monthKey(new Date()), book={version:1,months:{}}, storageError=false;
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
  const mutate=fn=>{const next=structuredClone(book);if(!next.months[selected])next.months[selected]=M.emptyMonth();fn(next.months[selected]);return save(next);};
  function tools(group,id,index,total){return `<div class="agenda-tools"><button type="button" data-agenda-action="up" data-group="${group}" data-id="${id}" ${index===0?'disabled':''} aria-label="Mover hacia arriba">↑</button><button type="button" data-agenda-action="down" data-group="${group}" data-id="${id}" ${index===total-1?'disabled':''} aria-label="Mover hacia abajo">↓</button><button type="button" data-agenda-action="remove" data-group="${group}" data-id="${id}" aria-label="Eliminar concepto">Eliminar</button></div>`;}
  function blocks(group,items){return items.map((item,i)=>`<article class="agenda-block"><div class="agenda-block-head"><input aria-label="Título del concepto" data-group="${group}" data-id="${item.id}" data-property="label" maxlength="2000" value="${escape(item.label)}">${tools(group,item.id,i,items.length)}</div><div class="agenda-fields">${item.fields.map(f=>`<div class="agenda-field"><input aria-label="Nombre del campo" data-group="${group}" data-id="${item.id}" data-field="${f.id}" data-property="label" maxlength="2000" value="${escape(f.label)}"><input aria-label="${escape(f.label)}: valor" data-group="${group}" data-id="${item.id}" data-field="${f.id}" data-property="value" maxlength="2000" value="${escape(f.value)}" placeholder="Anotar…"><button type="button" data-agenda-action="remove-field" data-group="${group}" data-id="${item.id}" data-field="${f.id}" aria-label="Eliminar campo">×</button></div>`).join('')}</div><button type="button" data-agenda-action="add-field" data-group="${group}" data-id="${item.id}">+ Campo</button></article>`).join('');}
  function render(){
    const m=book.months[selected];
    dialog.innerHTML=`<div class="agenda-header"><div><h2>Agenda de pagos</h2><p>Planilla informativa · No modifica saldos ni movimientos.</p></div><button type="button" data-agenda-action="close" aria-label="Cerrar planilla">×</button></div><div class="agenda-month"><button type="button" data-agenda-action="prev" aria-label="Mes anterior">‹</button><label>${escape(title(selected))}<input aria-label="Mes de la planilla" type="month" id="agenda-month" value="${selected}"></label><button type="button" data-agenda-action="next" aria-label="Mes siguiente">›</button></div><p data-agenda-status role="status">${storageError?'No se pudo leer la planilla guardada.':m?'Planilla de este mes guardada.':'Este mes todavía no tiene una planilla.'}</p><div class="agenda-controls"><button type="button" data-agenda-action="copy">Copiar mes anterior</button><button type="button" data-agenda-action="import">Importar planilla</button><button type="button" data-agenda-action="export">Exportar planilla</button></div>${!m?'<button type="button" class="primary" data-agenda-action="create">Crear planilla de este mes</button>':`<section><h3>Orden de pago</h3><p class="hint">Mové los conceptos con ↑ ↓. Marcar pagado es solo una anotación.</p>${m.order.map((item,i)=>`<div class="agenda-order"><input type="checkbox" aria-label="${escape(item.label)}: pagado" data-group="order" data-id="${item.id}" data-property="paid" ${item.paid?'checked':''}><input aria-label="Concepto del orden de pago" data-group="order" data-id="${item.id}" data-property="label" maxlength="2000" value="${escape(item.label)}">${tools('order',item.id,i,m.order.length)}</div>`).join('')}<button type="button" data-agenda-action="add" data-group="order">+ Concepto</button></section><section><h3>Me deben</h3>${blocks('receivables',m.receivables)}<button type="button" data-agenda-action="add" data-group="receivables">+ Persona / ingreso esperado</button></section><section><h3>Debo · Servicios y otros</h3>${blocks('debts',m.debts)}<button type="button" data-agenda-action="add" data-group="debts">+ Servicio / concepto</button></section><section><h3>Tarjetas y créditos</h3>${blocks('cards',m.cards)}<button type="button" data-agenda-action="add" data-group="cards">+ Tarjeta / crédito</button></section>`}`;
  }
  function exportFile(){const blob=new Blob([JSON.stringify({format:'tarjetas-agenda',...book},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='agenda-pagos.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  dialog.addEventListener('input',event=>{
    const input=event.target;if(!input.dataset.group)return;
    mutate(m=>{const item=m[input.dataset.group].find(x=>x.id===input.dataset.id);if(!item)return;const target=input.dataset.field?item.fields.find(f=>f.id===input.dataset.field):item;target[input.dataset.property]=input.type==='checkbox'?input.checked:input.value;});
  });
  dialog.addEventListener('change',event=>{if(event.target.id==='agenda-month'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)){selected=event.target.value;render();dialog.scrollTop=0;}});
  dialog.addEventListener('click',event=>{
    const b=event.target.closest('[data-agenda-action]');if(!b)return;
    const action=b.dataset.agendaAction, group=b.dataset.group;
    if(action==='close'){dialog.close();return;}
    if(action==='prev'||action==='next'){const d=new Date(Number(selected.slice(0,4)),Number(selected.slice(5))-1+(action==='next'?1:-1),1);selected=monthKey(d);render();dialog.scrollTop=0;return;}
    if(action==='import'){file.value='';file.click();return;}
    if(action==='export'){exportFile();return;}
    if(action==='copy'){
      const d=new Date(Number(selected.slice(0,4)),Number(selected.slice(5))-2,1),previous=book.months[monthKey(d)];
      if(!previous){status('No hay planilla guardada en el mes anterior.');return;}
      if(!confirm('Copiará todas las anotaciones del mes anterior a este mes. Podés editarlas después. ¿Continuar?'))return;
      const next=structuredClone(book);next.months[selected]=structuredClone(previous);next.months[selected].order.forEach(x=>x.paid=false);if(save(next))render();return;
    }
    if(action==='create'){if(mutate(()=>{}))render();return;}
    if(action==='remove'||action==='remove-field'){if(!confirm('¿Eliminar esta anotación de la planilla de este mes?'))return;}
    const ok=mutate(m=>{
      if(action==='add'){m[group].push(group==='order'?{id:M.uid(),label:'Nuevo concepto',paid:false}:M.block('Nuevo concepto',group==='cards'?['Vence','Cierra','Total','Mío','Ajeno','Mes anterior']:['Importe','Notas']));return;}
      const index=m[group].findIndex(x=>x.id===b.dataset.id);if(index<0)return;
      if(action==='remove')m[group].splice(index,1);
      if(action==='up'||action==='down'){const other=index+(action==='up'?-1:1);if(other>=0&&other<m[group].length)[m[group][index],m[group][other]]=[m[group][other],m[group][index]];}
      if(action==='add-field')m[group][index].fields.push(M.field('Nuevo campo'));
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
    history.replaceState(null,'',location.pathname+location.search);
    render();if(!dialog.open)dialog.showModal();
    try {
      if(encoded.length>30000)throw Error('La plantilla es demasiado grande.');
      const bytes=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      importBook(JSON.parse(await new Response(stream).text()));
    } catch(error){status(error.message||'No se pudo cargar la plantilla.');}
  }
  document.getElementById('open-payment-agenda').addEventListener('click',()=>{render();dialog.showModal();});
  window.PaymentAgenda={exportData:()=>structuredClone(book)};
  window.addEventListener('hashchange',loadPrivateTemplate);
  loadPrivateTemplate();
})();
