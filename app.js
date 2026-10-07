let editingId=null, editingOneId=null, detailCard=null;
const KEY="tarjetas_app_v3";
import { ENCRYPTED_SEED } from './data.js';
async function decryptSeed(){
  const password=prompt("Ingresá la contraseña para cargar tus datos guardados:");
  if(password===null) throw new Error("Carga cancelada");
  try{
    const meta=JSON.parse(ENCRYPTED_SEED);
    const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
    const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
    const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:b64(meta.salt),iterations:meta.iter,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["decrypt"]);
    const compressed=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(meta.iv)},key,b64(meta.data));
    const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
    const plain=await new Response(stream).arrayBuffer();
    return JSON.parse(new TextDecoder().decode(plain));
  }catch(e){
    alert("Contraseña incorrecta o datos protegidos no válidos.");
    throw e;
  }
}
let s=JSON.parse(localStorage.getItem(KEY)||"null");
if(!s){s=await decryptSeed(); localStorage.setItem(KEY,JSON.stringify(s));}
// Normalize category spelling/case so previously loaded data is grouped correctly.
const canonicalCats={"supermercado":"Supermercado","farmacia":"Farmacia","otros/comida":"Otros/comida","nafta":"Nafta","prestamos":"Préstamos","préstamos":"Préstamos"};
const canonicalCat=x=>canonicalCats[String(x||"").trim().toLowerCase()]||String(x||"").trim();
s.onePaymentCategories=s.onePaymentCategories.map(c=>canonicalCat(c));
s.onePaymentCategories=[...new Set(s.onePaymentCategories.map(c=>canonicalCat(c)))];
s.onePayments.forEach(e=>e.category=canonicalCat(e.category));
s.cards=s.cards.map(c=>c.name.toLowerCase()==="master galicia mia"?{...c,name:"MASTER GALICIA MIA"}:c);
s.onePayments.forEach(e=>{if(e.card.toLowerCase()==="master galicia mia")e.card="MASTER GALICIA MIA"});
s.expenses.forEach(e=>{if(e.card.toLowerCase()==="master galicia mia")e.card="MASTER GALICIA MIA"});
// Test record for verifying the automatic "Terminados" section.
// It is added only once and is already finished relative to the current month.

save();
let selected=new Date(); selected.setDate(1);
let oneSelected=new Date(selected);
let detailSelected=new Date(selected);
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:2}).format(n||0);
const ym=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const parseMonth=x=>{let [a,b]=x.split("-").map(Number);return new Date(a,b-1,1)};
const add=(d,n)=>new Date(d.getFullYear(),d.getMonth()+n,1);
const idx=d=>d.getFullYear()*12+d.getMonth();
const monthName=d=>d.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
function consumptionDate(value){
  const text=String(value??'').trim();
  let match=text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/),year,month,day;
  if(match){[,year,month,day]=match;}else{
    match=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if(!match)return '';[,day,month,year]=match;
  }
  const date=new Date(Number(year),Number(month)-1,Number(day));
  if(date.getFullYear()!==Number(year)||date.getMonth()+1!==Number(month)||date.getDate()!==Number(day))return '';
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function fillConsumptionDate(record){
  const input=document.getElementById('oneDate'),original=String(record.date??''),normalized=consumptionDate(original);
  input.type=original&&!normalized?'text':'date';
  input.value=normalized||original;
}
const dateBR=x=>{const normalized=consumptionDate(x);if(!normalized)return String(x??'');const [year,month,day]=normalized.split('-');return `${day}/${month}/${year}`;};

const active=(e,m)=>{let i=idx(m)-idx(parseMonth(e.start));return i>=0&&i<Number(e.installments)};
const endMonth=e=>add(parseMonth(e.start),Math.max(0,Number(e.installments)-1));
const finished=e=>idx(selected)>idx(endMonth(e));
const purpose=e=>['Ajeno','Préstamos'].includes(e.responsible)?e.responsible:'Mío';
const ajeno=e=>purpose(e)==='Ajeno';
const personal=e=>purpose(e)==='Mío';
function splitTotals(items,field){return items.reduce((t,e)=>{const value=Number(e[field]);t.total+=value;t[purpose(e)==='Ajeno'?'other':purpose(e)==='Préstamos'?'loans':'mine']+=value;return t;},{total:0,mine:0,other:0,loans:0});}
const remain=e=>{let now=new Date();now.setDate(1);let st=parseMonth(e.start),en=endMonth(e);if(idx(now)<idx(st))return Number(e.installments);if(idx(now)>idx(en))return 0;return Number(e.installments)-(idx(now)-idx(st));};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const jsarg=x=>JSON.stringify(x);
function save(){localStorage.setItem(KEY,JSON.stringify(s));window.DriveBackup?.changed();}
function quotaTotals(m){const a=s.expenses.filter(e=>active(e,m));return {a,...splitTotals(a,'monthly')};}
function oneTotal(m){return oneTotals(m).total;}
function oneTotals(m){const a=s.onePayments.filter(e=>e.month===ym(m));return {a,...splitTotals(a,'amount')};}
function futureQuotaTotal(m,predicate=()=>true){
  return s.expenses.filter(predicate).reduce((sum,e)=>{
    const start=parseMonth(e.start), end=endMonth(e), afterStart=Math.max(idx(m)+1,idx(start)), last=idx(end);
    if(afterStart>last)return sum;
    return sum+Number(e.monthly)*(last-afterStart+1);
  },0);
}
function render(){
  $("month").textContent=monthName(selected);
  const q=quotaTotals(selected), ot=oneTotals(selected);
  $("total").textContent=money(q.total);
  $("mine").textContent=money(q.mine);
  $("other").textContent=money(q.other);
  $("oneTotal").textContent=money(ot.total);
  $("oneMine").textContent=money(ot.mine);
  $("oneOther").textContent=money(ot.other);
  $("grandTotal").textContent=money(q.total+ot.total);
  $("grandMine").textContent=money(q.mine+ot.mine);
  $("grandOther").textContent=money(q.other+ot.other);
  $("grandLoans").textContent=money(q.loans+ot.loans);
  $("quotaLoans").textContent=money(q.loans);
  $("oneLoans").textContent=money(ot.loans);
  $("cardTotals").innerHTML=s.cards.map(c=>{
    let quota=q.a.filter(e=>e.card===c.name).reduce((x,e)=>x+Number(e.monthly),0);
    let one=s.onePayments.filter(e=>e.card===c.name&&e.month===ym(selected)).reduce((x,e)=>x+Number(e.amount),0);
    return `<button class="row card-row" onclick="openCard('${esc(c.name).replace(/'/g,"\'")}')">
      <span class="card-main-left"><i class="dot" style="background:${esc(c.color)}"></i><span><b>${esc(c.name)}</b><span class="card-main-lines"><small>Cuotas <strong>${money(quota)}</strong></small><small>1 pago <strong>${money(one)}</strong></small></span></span></span>
      <span class="card-main-total">${money(quota+one)}</span>
    </button>`;
  }).join("")||'<div class="empty">No hay tarjetas.</div>';
  renderSummary(); renderPending(); renderFinished(); renderCards(); renderOnePayments(); renderHistory(); renderCategories(); renderMovements();
  if(detailCard)renderCardDetail();
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",document.getElementById(b.dataset.go)?.classList.contains("active")));
}
function renderMovements(){
  const rows=[
    ...s.onePayments.map(e=>({e,kind:"one",date:e.createdAt,label:new Date(e.createdAt).toLocaleString("es-AR"),amount:Number(e.amount)})),
    ...s.expenses.map(e=>({e,kind:"quota",date:e.createdAt,label:new Date(e.createdAt).toLocaleString("es-AR"),amount:Number(e.monthly)*Number(e.installments)}))
  ].filter(row=>row.date && Number.isFinite(Date.parse(row.date))).sort((a,b)=>b.date.localeCompare(a.date)||String(b.e.id).localeCompare(String(a.e.id)));
  $("movementsCount").textContent=`${rows.length} movimiento${rows.length===1?"":"s"} · Últimas cargas primero`;
  $("movementsList").innerHTML=rows.map(({e,kind,label,amount})=>`<article class="row expense-row movement-row"><div class="movement-info"><small class="movement-date">${esc(label)}</small><b>${esc(e.description)}</b><small>${esc(e.card)} · ${esc(purpose(e))}</small><small>${kind==="one"?`1 pago · Consumo: ${esc(dateBR(e.date))} · ${esc(e.category||"Sin categoría")}`:`${Number(e.installments)} cuotas de ${money(e.monthly)} · Inicio: ${esc(e.start)}`}</small></div><div class="expense-side"><b>${money(amount)}</b>${kind==="quota"?'<small>Importe total en cuotas</small>':''}<span class="actions"><a class="button" href="?screen=${kind==="one"?"oneAddScreen":"addScreen"}&${kind==="one"?"editOne":"editExpense"}=${encodeURIComponent(String(e.id))}">Editar</a><button type="button" class="danger" data-action="${kind==="one"?"delete-one":"delete-expense"}" data-id="${esc(String(e.id))}">Eliminar</button></span></div></article>`).join("")||'<div class="empty">Las nuevas cargas aparecerán aquí. Los registros anteriores siguen en sus pestañas; no tienen fecha de carga guardada.</div>';
}
function renderSummary(){
  const dates=[];for(let i=0;i<18;i++)dates.push(add(selected,i));
  $("months").innerHTML=dates.map(d=>{const q=quotaTotals(d),o=oneTotals(d);return `<div class="month"><b>${esc(monthName(d))}</b><div class="mini"><div><small>Cuotas</small>${money(q.total)}</div><div><small>Míos</small>${money(q.mine+o.mine)}</div><div><small>Ajenos</small>${money(q.other+o.other)}</div><div><small>Préstamos</small>${money(q.loans+o.loans)}</div><div><small>1 pago</small>${money(o.total)}</div><div><small>Total</small>${money(q.total+o.total)}</div></div></div>`}).join("");
}
function renderOnePayments(){
  $("oneMonthTitle").textContent=monthName(oneSelected);
  let list=s.onePayments.filter(e=>e.month===ym(oneSelected));
  let cats=s.onePaymentCategories.map((c,i)=>{
    let items=list.filter(e=>canonicalCat(e.category)===c);
    return {name:c,...splitTotals(items,"amount"),items};
  });
  let uncategorized=list.filter(e=>!s.onePaymentCategories.some(c=>canonicalCat(c)===canonicalCat(e.category)));
  if(uncategorized.length)cats.push({name:"Otras/anteriores",...splitTotals(uncategorized,"amount"),items:uncategorized});
  const itemHtml=e=>`<div class="row expense-row category-expense"><span><b>${esc(e.description)}</b><br><small>${dateBR(e.date)} · ${esc(e.card)} · ${esc(purpose(e))}</small></span><span class="expense-side"><b>${money(e.amount)}</b><span class="actions"><a class="button" href="?screen=oneAddScreen&editOne=${encodeURIComponent(String(e.id))}">Editar</a><button type="button" class="danger" data-action="delete-one" data-id="${esc(String(e.id))}">Eliminar</button></span></span></div>`;
  const categoryHtml=(c,i)=>`<div class="category-group"><button type="button" class="category-toggle" data-action="toggle-category" data-index="${i}"><span><b>${esc(c.name)}</b><small>${c.items.length} consumo${c.items.length===1?"":"s"}</small></span><span class="category-total"><strong>${money(c.total)}</strong><small>Míos ${money(c.mine)} · Ajenos ${money(c.other)} · Préstamos ${money(c.loans)}</small><span class="chevron">›</span></span></button><div class="category-items" id="catItems${i}">${c.items.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(itemHtml).join("")||'<div class="category-empty">Sin consumos en este mes.</div>'}</div></div>`;
  const grand=splitTotals(list,"amount");
  $("oneSummary").innerHTML=cats.map(categoryHtml).join("")+`<div class="row total-row category-grand-total"><span><b>Total general</b><small>Míos ${money(grand.mine)} · Ajenos ${money(grand.other)} · Préstamos ${money(grand.loans)}</small></span><b>${money(grand.total)}</b></div>`;
  $("oneList").innerHTML="";
}
window.toggleOneCategory=i=>{const box=$("catItems"+i),btn=box?.previousElementSibling;if(!box)return;const open=box.classList.toggle("open");btn?.classList.toggle("open",open);};

function renderPending(){
  // Mantiene el orden original de carga: cada gasto nuevo se agrega al final.
  $("pendingList").innerHTML=s.expenses.filter(e=>remain(e)>0).map(e=>`<div class="row expense-row"><span><b>${esc(e.description)}</b><br><small>${esc(e.card)} · ${remain(e)} cuota(s) restantes · ${esc(purpose(e))} · termina ${monthName(endMonth(e))}</small></span><span class="expense-side"><b>${money(Number(e.monthly)*remain(e))}</b><span class="actions"><a class="button" href="?screen=addScreen&editExpense=${encodeURIComponent(String(e.id))}">Editar</a><button type="button" class="danger" data-action="delete-expense" data-id="${esc(String(e.id))}">Eliminar</button></span></span></div>`).join("")||'<div class="empty">No hay gastos pendientes.</div>';
  $("futurePending").textContent=money(futureQuotaTotal(selected));
  $("futurePendingBreakdown").textContent=`Mías ${money(futureQuotaTotal(selected,personal))} · Ajenas ${money(futureQuotaTotal(selected,ajeno))} · Préstamos ${money(futureQuotaTotal(selected,e=>purpose(e)==='Préstamos'))}`;
}
function renderFinished(){
  const now=new Date(); now.setDate(1);
  let all=s.expenses.filter(e=>idx(endMonth(e))<idx(now)).sort((a,b)=>idx(endMonth(b))-idx(endMonth(a)));
  $("finishedList").innerHTML=all.map(e=>`<div class="row expense-row"><span><b>${esc(e.description)}</b><br><small>${esc(e.card)} · ${e.installments} cuotas · terminó ${monthName(endMonth(e))} · ${esc(purpose(e))}</small></span><span class="expense-side"><b>${money(Number(e.monthly))}/mes</b><span class="actions"><a class="button" href="?screen=addScreen&editExpense=${encodeURIComponent(String(e.id))}">Editar</a><button type="button" class="danger" data-action="delete-expense" data-id="${esc(String(e.id))}">Eliminar</button></span></span></div>`).join("")||'<div class="empty">Todavía no hay gastos terminados.</div>';
}
function renderCards(){ $("cardsList").innerHTML=s.cards.map((c,i)=>`<div class="row"><span><i class="dot" style="background:${esc(c.color)}"></i>${esc(c.name)}</span><span class="actions"><button onclick="openCard('${esc(c.name).replace(/'/g,"\\'")}')">Ver</button><button onclick="renameCard(${i})">Editar</button></span></div>`).join(""); }
function renderCategories(){ $("categoriesList").innerHTML=s.onePaymentCategories.map((c,i)=>`<div class="row"><span>${esc(c)}</span><span class="actions"><button onclick="renameCategory(${i})">Editar</button><button class="danger" onclick="deleteCategory(${i})">Eliminar</button></span></div>`).join("")||'<div class="empty">No hay categorías.</div>'; }
function renderHistory(){
  // Lista completa del período registrado: meses anteriores, actual y futuros.
  // El mes actual queda resaltado y se usa como punto de referencia al entrar.
  const now=new Date(); now.setDate(1);
  const dates=[];
  const allExpenseMonths=s.expenses.flatMap(e=>[parseMonth(e.start),endMonth(e)]);
  const allOneMonths=s.onePayments.map(e=>parseMonth(e.month));
  const allDates=[...allExpenseMonths,...allOneMonths,now];
  let first=new Date(Math.min(...allDates.map(d=>d.getTime())));
  let last=new Date(Math.max(...allDates.map(d=>d.getTime())));
  // Dejá un margen para que también se puedan consultar meses cercanos sin datos.
  first=add(first,-3); last=add(last,3);
  for(let d=new Date(first);idx(d)<=idx(last);d=add(d,1)) dates.push(new Date(d));
  $("historyList").innerHTML=dates.map(d=>{
    const qt=quotaTotals(d),ot=oneTotals(d),q=qt.mine,o=ot.mine,total=q+o,isCurrent=idx(d)===idx(now);
    return `<div class="row history-month${isCurrent?" current-month":""}" id="${isCurrent?"historyCurrent":""}"><span><b>${esc(monthName(d))}${isCurrent?' <span class="current-badge">MES ACTUAL</span>':''}</b><small>Mis cuotas ${money(q)} · Mis consumos a un pago ${money(o)}</small><small class="history-purpose">Préstamos ${money(qt.loans+ot.loans)} · Ajenos ${money(qt.other+ot.other)}</small></span><b>${money(total)}</b></div>`;
  }).join("");
  requestAnimationFrame(()=>{const el=$("historyCurrent");if(el)el.scrollIntoView({block:"center",behavior:"auto"});});
}
function openCard(name){
  detailCard=name; detailSelected=new Date(selected);
  renderCardModal();
  $("cardModal").classList.add("open"); $("cardModal").setAttribute("aria-hidden","false");
}
window.openCard=openCard;
function closeCardModal(){
  $("cardModal").classList.remove("open"); $("cardModal").setAttribute("aria-hidden","true");
}
function renderCardModal(){
  if(!detailCard)return;
  const q=quotaTotals(selected).a.filter(e=>e.card===detailCard);
  const o=s.onePayments.filter(e=>e.card===detailCard&&e.month===ym(selected));
  const qt=splitTotals(q,'monthly'),ot=splitTotals(o,'amount');
  $("cardModalTitle").textContent=detailCard;
  $("cardModalSummary").innerHTML=`<div class="modal-total">${money(qt.total+ot.total)}</div>
    <div class="modal-section"><b>Cuotas</b><span>Total ${money(qt.total)}</span><span>Mías ${money(qt.mine)}</span><span>Ajenas ${money(qt.other)}</span><span>Préstamos ${money(qt.loans)}</span></div>
    <div class="modal-section"><b>Consumo 1 pago</b><span>Total ${money(ot.total)}</span><span>Míos ${money(ot.mine)}</span><span>Ajenos ${money(ot.other)}</span><span>Préstamos ${money(ot.loans)}</span></div>`;
}
function renderCardDetail(){
  if(!detailCard)return;$("cardDetailTitle").textContent=detailCard;$("detailMonth").textContent=monthName(detailSelected);let q=s.expenses.filter(e=>e.card===detailCard&&active(e,detailSelected));let o=s.onePayments.filter(e=>e.card===detailCard&&e.month===ym(detailSelected));let qt=q.reduce((x,e)=>x+Number(e.monthly),0),ot=o.reduce((x,e)=>x+Number(e.amount),0);
  const qb=splitTotals(q,"monthly"),ob=splitTotals(o,"amount");
  $("detailSummary").innerHTML=`<div class="stats"><div><small>Cuotas</small><b>${money(qt)}</b></div><div><small>1 pago</small><b>${money(ot)}</b></div><div><small>Total tarjeta</small><b>${money(qt+ot)}</b></div><div><small>Míos</small><b>${money(qb.mine+ob.mine)}</b></div><div><small>Ajenos</small><b>${money(qb.other+ob.other)}</b></div><div><small>Préstamos</small><b>${money(qb.loans+ob.loans)}</b></div></div>`;
  $("detailInstallments").innerHTML=q.map(e=>`<div class="row expense-row"><span><b>${esc(e.description)}</b><br><small>${installmentLabel(e,detailSelected)} · ${remainFor(e,detailSelected)} restantes · ${esc(purpose(e))}</small></span><span class="expense-side"><b>${money(e.monthly)}</b><span class="actions"><a class="button" href="?screen=addScreen&editExpense=${encodeURIComponent(String(e.id))}">Editar</a><button type="button" class="danger" data-action="delete-expense" data-id="${esc(String(e.id))}">Eliminar</button></span></span></div>`).join("")||'<div class="empty">No hay cuotas activas en este mes.</div>';
  $("detailOne").innerHTML=o.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="row expense-row"><span><b>${esc(e.description)}</b><br><small>${dateBR(e.date)} · ${esc(e.category)} · ${esc(purpose(e))}</small></span><span class="expense-side"><b>${money(e.amount)}</b><span class="actions"><a class="button" href="?screen=oneAddScreen&editOne=${encodeURIComponent(String(e.id))}">Editar</a><button type="button" class="danger" data-action="delete-one" data-id="${esc(String(e.id))}">Eliminar</button></span></span></div>`).join("")||'<div class="empty">No hay consumos a un pago en este mes.</div>';
}
function remainFor(e,m){let i=idx(m)-idx(parseMonth(e.start));return Math.max(0,Number(e.installments)-i);}
function installmentLabel(e,m){const current=idx(m)-idx(parseMonth(e.start))+1;return `${Math.max(1,current)} de ${Number(e.installments)}`;}
function resetToCurrentMonth(){const now=new Date();now.setDate(1);selected=new Date(now);oneSelected=new Date(now);detailSelected=new Date(now);}
function go(id){
  if(id==="home"||id==="history") resetToCurrentMonth();
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");
  if(id==="cardDetail")renderCardDetail();
  try{history.replaceState({},"",id==="home"?location.pathname:`?screen=${encodeURIComponent(id)}`)}catch(_){}
  render();
  requestAnimationFrame(()=>{if(id==="home")window.scrollTo({top:0,behavior:"auto"});});
}
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("prev").onclick=()=>{selected=add(selected,-1);oneSelected=new Date(selected);render()};$("next").onclick=()=>{selected=add(selected,1);oneSelected=new Date(selected);render()};
$("onePrev").onclick=()=>{oneSelected=add(oneSelected,-1);renderOnePayments()};$("oneNext").onclick=()=>{oneSelected=add(oneSelected,1);renderOnePayments()};
$("openCardDetails").onclick=()=>{closeCardModal();go("cardDetail")};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCardModal()});
$("detailPrev").onclick=()=>{detailSelected=add(detailSelected,-1);renderCardDetail()};$("detailNext").onclick=()=>{detailSelected=add(detailSelected,1);renderCardDetail()};
function populate(){ $("card").innerHTML=s.cards.map(c=>`<option>${esc(c.name)}</option>`).join(""); }
function populateOneCategories(preferred=$("oneCategory").value){
  const existing=editingOneId!==null?s.onePayments.find(e=>String(e.id)===String(editingOneId)):null;
  const names=[...s.onePaymentCategories];
  if(existing?.category&&!names.includes(existing.category))names.push(existing.category);
  $("oneCategory").innerHTML=names.map(c=>`<option>${esc(c)}</option>`).join("");
  if(names.includes(preferred))$("oneCategory").value=preferred;
}
function populateOne(){ $("oneCard").innerHTML=s.cards.map(c=>`<option>${esc(c.name)}</option>`).join("");populateOneCategories(); }

function setFormMode(editing){$("addScreen").querySelector("h2").textContent=editing?"Editar gasto":"Agregar gasto";$("form").querySelector("button[type=submit]").textContent=editing?"Guardar cambios":"Guardar gasto";}
function setOneMode(editing){$("oneAddScreen").querySelector("h2").textContent=editing?"Editar consumo":"Agregar consumo a un pago";$("oneForm").querySelector("button[type=submit]").textContent=editing?"Guardar cambios":"Guardar consumo";}
$("add").onclick=null;
function addOneForm(){editingOneId=null;$("oneForm").reset();$("oneDate").type="date";populateOne();$("oneDate").value=new Date().toISOString().slice(0,10);$("oneMonth").value=ym(selected);$("oneResponsible").value="Mío";setOneMode(false);go("oneAddScreen");}
$("addOne").onclick=null;$("addOne2").onclick=addOneForm;
window.editExpense=id=>{let e=s.expenses.find(x=>String(x.id)===String(id));if(!e)return;editingId=String(id);populate();$("desc").value=e.description;$("card").value=e.card;$("amount").value=e.monthly;$("installments").value=e.installments;$("start").value=e.start;$("expenseResponsible").value=purpose(e);setFormMode(true);go("addScreen")};
window.deleteExpense=id=>{let e=s.expenses.find(x=>String(x.id)===String(id));if(e&&confirm(`¿Eliminar "${e.description}"? Esta acción no se puede deshacer.`)){s.expenses=s.expenses.filter(x=>String(x.id)!==String(id));save();render()}};
document.addEventListener("click", function(ev){
  const b=ev.target.closest("[data-action]"); if(!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a=b.dataset.action;
  if(a==="delete-expense") return window.deleteExpense(b.dataset.id);
  if(a==="delete-one") return window.deleteOne(b.dataset.id);
  if(a==="toggle-category") return window.toggleOneCategory(Number(b.dataset.index));
  if(a==="close-card-modal") return closeCardModal();
});

$("form").onsubmit=e=>{e.preventDefault();let d=$("desc").value.trim(),responsible=$("expenseResponsible").value;if(!d||!$("card").value||!(+$("amount").value>0)||!(+$("installments").value>0)||!$("start").value)return alert("Completá todos los datos.");let data={description:d,card:$("card").value,monthly:+$("amount").value,installments:+$("installments").value,start:$("start").value,responsible:purpose({responsible})};if(editingId!==null){let i=s.expenses.findIndex(x=>String(x.id)===String(editingId));if(i>=0)s.expenses[i]={...s.expenses[i],...data}}else s.expenses.push({id:crypto.randomUUID(),createdAt:new Date().toISOString(),...data});editingId=null;save();go("home")};
$("oneForm").onsubmit=e=>{e.preventDefault();const existing=editingOneId!==null?s.onePayments.find(x=>String(x.id)===String(editingOneId)):null;const enteredDate=$("oneDate").value;const unchangedDate=existing && enteredDate===(consumptionDate(existing.date)||String(existing.date??''));const savedDate=unchangedDate?existing.date:consumptionDate(enteredDate);if(!savedDate)return alert("Revisá la fecha del consumo.");let d=$("oneDesc").value.trim();if(!d||!(+$("oneAmount").value>0)||!$("oneDate").value||!$("oneCard").value||!$("oneCategory").value||!$("oneMonth").value)return alert("Completá todos los datos.");let data={description:d,amount:+$("oneAmount").value,date:savedDate,card:$("oneCard").value,category:$("oneCategory").value,month:$("oneMonth").value,responsible:purpose({responsible:$("oneResponsible").value})};if(editingOneId!==null){let i=s.onePayments.findIndex(x=>String(x.id)===String(editingOneId));if(i>=0)s.onePayments[i]={...s.onePayments[i],...data}}else s.onePayments.push({id:crypto.randomUUID(),createdAt:new Date().toISOString(),...data});editingOneId=null;save();oneSelected=parseMonth(data.month);selected=parseMonth(data.month);go("onePayments")};
window.editOne=id=>{let e=s.onePayments.find(x=>String(x.id)===String(id));if(!e)return;editingOneId=String(id);populateOne();$("oneDesc").value=e.description;$("oneAmount").value=e.amount;fillConsumptionDate(e);$("oneCard").value=e.card;$("oneCategory").value=e.category;$("oneMonth").value=e.month;$("oneResponsible").value=purpose(e);setOneMode(true);go("oneAddScreen")};
window.deleteOne=id=>{let e=s.onePayments.find(x=>String(x.id)===String(id));if(e&&confirm(`¿Eliminar "${e.description}"? Esta acción no se puede deshacer.`)){s.onePayments=s.onePayments.filter(x=>String(x.id)!==String(id));save();render()}};
$("newCard").onclick=()=>{let n=prompt("Nombre de la nueva tarjeta:");if(n&&n.trim()&&!s.cards.some(c=>c.name.toLowerCase()===n.trim().toLowerCase())){s.cards.push({name:n.trim(),color:"#4b5563"});save();render()}else if(n)alert("Esa tarjeta ya existe.")};
window.renameCard=i=>{let n=prompt("Nuevo nombre:",s.cards[i].name);if(n&&n.trim()){let old=s.cards[i].name,newName=n.trim();s.cards[i].name=newName;s.expenses.forEach(e=>{if(e.card===old)e.card=newName});s.onePayments.forEach(e=>{if(e.card===old)e.card=newName});save();render()}};
let categoriesReturn="onePayments";
function openCategories(from){categoriesReturn=from;go("categories");}
$("manageCategories").onclick=()=>openCategories("onePayments");
$("manageFormCategories").onclick=()=>openCategories("oneAddScreen");
$("categoriesBack").onclick=()=>{populateOneCategories();go(categoriesReturn);};
function createCategory(value){
  const name=canonicalCat(value);if(!name)return false;
  if(s.onePaymentCategories.some(c=>c.toLocaleLowerCase()===name.toLocaleLowerCase())){alert("Esa categoría ya existe.");return false;}
  s.onePaymentCategories.push(name);save();populateOneCategories(name);render();return true;
}
$("quickAddCategory").onclick=()=>{const name=prompt("Nombre de la nueva categoría:");if(name!==null)createCategory(name);};
$("addCategory").onclick=()=>{if(createCategory($("newCategory").value))$("newCategory").value="";};
$("newCategory").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();$("addCategory").click();}};
window.renameCategory=i=>{let n=prompt("Nuevo nombre:",s.onePaymentCategories[i]);if(n&&n.trim()){let old=s.onePaymentCategories[i],nn=canonicalCat(n);if(s.onePaymentCategories.some((c,j)=>j!==i&&c.toLocaleLowerCase()===nn.toLocaleLowerCase()))return alert("Esa categoría ya existe.");const selectedCategory=$("oneCategory").value;s.onePaymentCategories[i]=nn;s.onePayments.forEach(e=>{if(e.category===old)e.category=nn});save();populateOneCategories(selectedCategory===old?nn:selectedCategory);render()}};
window.deleteCategory=i=>{let c=s.onePaymentCategories[i];if(confirm(`¿Eliminar la categoría "${c}"? Los consumos históricos conservarán su categoría.`)){s.onePaymentCategories.splice(i,1);save();populateOneCategories();render()}};

function backupBlob(){
  const payload={version:1,app:"Control de Tarjetas",createdAt:new Date().toISOString(),data:{...s,paymentAgenda:window.PaymentAgenda?.exportData()}};
  return new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
}
function downloadBackup(){
  const url=URL.createObjectURL(backupBlob()); const a=document.createElement("a");
  a.href=url; a.download=`respaldo_control_tarjetas_${ym(new Date())}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function shareBackup(){
  const file=new File([backupBlob()],`respaldo_control_tarjetas_${ym(new Date())}.json`,{type:"application/json"});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    try{await navigator.share({title:"Respaldo Control de Tarjetas",text:"Respaldo de mis datos de Control de Tarjetas",files:[file]});return;}catch(err){if(err?.name==="AbortError")return;}
  }
  downloadBackup();
  alert("Tu navegador no permite compartir el archivo directamente. Se descargó el respaldo para que puedas guardarlo en Google Drive.");
}
function validBackup(obj){
  const d=obj?.data||obj;
  return d && Array.isArray(d.expenses) && Array.isArray(d.cards) && Array.isArray(d.onePayments) && Array.isArray(d.onePaymentCategories);
}
$("backup").onclick=()=>go("backupScreen");
$("downloadBackup").onclick=downloadBackup;
$("shareBackup").onclick=shareBackup;
$("importBackup").onclick=()=>$("backupFile").click();
$("backupFile").onchange=ev=>{
  const file=ev.target.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const obj=JSON.parse(reader.result); const d=obj?.data||obj;
      if(!validBackup(obj)) throw new Error("Formato inválido");
      if(!confirm("Esto reemplazará los datos actuales de la app por los del respaldo. ¿Querés continuar?")) return;
      s={expenses:d.expenses,cards:d.cards,onePayments:d.onePayments,onePaymentCategories:d.onePaymentCategories};
      save(); selected=new Date();selected.setDate(1);oneSelected=new Date(selected);detailSelected=new Date(selected);render();go("home");
      alert("Respaldo restaurado correctamente.");
    }catch(e){alert("No pude leer ese respaldo. Elegí un archivo JSON creado por esta app.");}
    ev.target.value="";
  };
  reader.readAsText(file);
};
populate();
populateOne();
const params=new URLSearchParams(location.search);
const requestedScreen=params.get("screen");
const editExpenseParam=params.get("editExpense");
const editOneParam=params.get("editOne");
if(requestedScreen==="addScreen"){
  if(editExpenseParam!==null){
    const e=s.expenses.find(x=>String(x.id)===String(editExpenseParam));
    if(e){ editingId=String(e.id); populate(); $("desc").value=e.description; $("card").value=e.card; $("amount").value=e.monthly; $("installments").value=e.installments; $("start").value=e.start; $("expenseResponsible").value=purpose(e); setFormMode(true); go("addScreen"); }
    else { setFormMode(false); $("start").value=ym(selected); go("addScreen"); }
  } else { setFormMode(false); $("start").value=ym(selected); go("addScreen"); }
}
if(requestedScreen==="movements")go("movements");
if(requestedScreen==="oneAddScreen"){
  if(editOneParam!==null){
    const e=s.onePayments.find(x=>String(x.id)===String(editOneParam));
    if(e){ editingOneId=String(e.id); populateOne(); $("oneDesc").value=e.description; $("oneAmount").value=e.amount; fillConsumptionDate(e); $("oneCard").value=e.card; $("oneCategory").value=e.category; $("oneMonth").value=e.month; $("oneResponsible").value=purpose(e); setOneMode(true); go("oneAddScreen"); }
    else { setOneMode(false); $("oneDate").value=new Date().toISOString().slice(0,10); $("oneMonth").value=ym(selected); go("oneAddScreen"); }
  } else { setOneMode(false); $("oneDate").value=new Date().toISOString().slice(0,10); $("oneMonth").value=ym(selected); go("oneAddScreen"); }
}
render();

// Navigation fallback: forms also open through normal URL query links, so Android/PWA browsers do not depend on click handlers.

window.DriveBackup?.init({app:"tarjetas",getBackup:()=>({version:1,app:"Control de Tarjetas",createdAt:new Date().toISOString(),data:{...structuredClone(s),paymentAgenda:window.PaymentAgenda?.exportData()}})});

if (window.isSecureContext && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("sw.js", document.baseURI), {scope: new URL("./", document.baseURI).pathname, updateViaCache: "none"}).then(registration => registration.update()).catch(() => {});
}
