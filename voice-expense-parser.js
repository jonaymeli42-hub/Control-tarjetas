// Conservative local parsing: always review before using the existing expense form.
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const units={cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiun:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900};
function wordsNumber(words){let total=0,group=0;for(const word of words){if(word==='y')continue;if(word==='mil'){total+=(group||1)*1000;group=0;}else if(word==='millon'||word==='millones'){total=(total+group||1)*1000000;group=0;}else if(word in units)group+=units[word];else return null;}return total+group;}
function digitsCents(value){
 let text=value.replace(/\s/g,'');if(!/^\d[\d.,]*$/.test(text))return null;
 const dot=text.lastIndexOf('.'),comma=text.lastIndexOf(','),last=Math.max(dot,comma);
 let whole=text,fraction='';
 if(last>=0){const tail=text.slice(last+1),separator=text[last];
  if(tail.length<=2){whole=text.slice(0,last).replace(/[.,]/g,'');fraction=tail;}
  else if(tail.length===3&&text.split(separator).slice(1).every(p=>p.length===3)){whole=text.replace(/[.,]/g,'');}
  else return null;
 }
 if(!/^\d+$/.test(whole)||!/^\d{0,2}$/.test(fraction))return null;
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));return Number.isSafeInteger(cents)&&cents>0&&cents<=1000000000000?cents:null;
}
export function parseVoiceExpense(transcript,categories=[],today=new Date().toISOString().slice(0,10)){
 const raw=String(transcript).trim().slice(0,1000),text=normalize(raw),warnings=[];
 let date=today,search=text;
 const dated=text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
 if(dated){const candidate=`${dated[3]}-${dated[2].padStart(2,'0')}-${dated[1].padStart(2,'0')}`;const parsed=new Date(candidate+'T12:00:00Z');
  if(Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===candidate)date=candidate;else warnings.push('Revisá la fecha: no pude reconocerla.');
  search=search.slice(0,dated.index)+' '.repeat(dated[0].length)+search.slice(dated.index+dated[0].length);
 }else if(/\b(ayer|anteayer)\b/.test(text)){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(/\banteayer\b/.test(text)?2:1));date=d.toISOString().slice(0,10);}
 const candidates=[];
 for(const match of search.matchAll(/\d+(?:[.,]\d+)*(?:\s+(?:mil|millones?|millon))?/g)){
  const number=match[0].match(/^[\d.,]+/)[0];let cents=digitsCents(number);if(cents&&/\bmil\b/.test(match[0]))cents*=1000;if(cents&&/\bmillones?\b|\bmillon\b/.test(match[0]))cents*=1000000;
  if(cents)candidates.push({start:match.index,end:match.index+match[0].length,cents});
 }
 const tokens=[...search.matchAll(/[a-z]+/g)];
 for(let i=0;i<tokens.length;i++){
  if(!(tokens[i][0] in units)&&!['mil','millon','millones'].includes(tokens[i][0]))continue;
  let j=i+1;while(j<tokens.length&&/^\s+$/.test(search.slice(tokens[j-1].index+tokens[j-1][0].length,tokens[j].index))&&(tokens[j][0] in units||['y','mil','millon','millones'].includes(tokens[j][0])))j++;
  while(j>i&&tokens[j-1][0]==='y')j--;
  const words=tokens.slice(i,j).map(t=>t[0]),number=wordsNumber(words),start=tokens[i].index,end=tokens[j-1].index+tokens[j-1][0].length;
  const before=search.slice(0,start),after=search.slice(end);
  if(number>0&&(number>=30||words.length>1||/^\s*pesos?\b/.test(after)||/\b(gaste|pague|importe|monto|gasto|compre)(?:\s+de)?\s*$/.test(before))&&!/\d\s*$/.test(before))candidates.push({start,end,cents:number*100});
  i=Math.max(i,j-1);
 }
 // "8.500 pesos con cincuenta" / "8500 con 50" is one amount, not two expenses.
 candidates.sort((a,b)=>a.start-b.start);
 if(candidates.length===2){const [a,b]=candidates,between=search.slice(a.end,b.start);if(/^\s*(?:pesos?\s*)?(?:con|coma)\s*$/.test(between)&&b.cents<10000){a.cents+=b.cents/100;a.end=b.end;candidates.pop();}}
 const unparsedNumber=tokens.some(token=>(units[token[0]]>=30||['mil','millon','millones'].includes(token[0]))&&!candidates.some(c=>token.index>=c.start&&token.index<c.end));
 const negative=/[-−]\s*\d/.test(search);
 const amount=!unparsedNumber&&!negative&&candidates.length===1&&Number.isSafeInteger(candidates[0].cents)&&candidates[0].cents<=1000000000000?candidates[0]:null;
 if(!amount)warnings.push(candidates.length>1?'Escuché varios números. Revisá el importe; dictá un gasto por vez.':'Completá el importe antes de guardar.');
 const cash=/\befectivo\b/.test(text),virtual=/\b(virtual|debito|transferencia|mercado pago)\b/.test(text);
 const location=cash!==virtual?(cash?'cash':'virtual'):'';
 if(!location)warnings.push('Elegí si pagaste con Efectivo o Virtual.');
 let categoryId='';
 const direct=categories.filter(c=>{const n=normalize(c.name);return n&&n!=='sin categoria'&&new RegExp('(?:^|\\W)'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|\\W)').test(text);});
 if(direct.length===1)categoryId=direct[0].id;
 if(!categoryId&&!direct.length){const aliases=[[/\b(supermercado|super|comida|almacen)\b/,'comida'],[/\b(farmacia|remedios|medicamentos)\b/,'farmacia'],[/\b(nafta|combustible|ypf)\b/,'nafta'],[/\b(colectivo|taxi|uber|transporte)\b/,'transporte']];for(const [pattern,name]of aliases)if(pattern.test(text)){const c=categories.find(c=>normalize(c.name)===name);if(c)categoryId=c.id;}}
 let description=amount?raw.slice(0,amount.start)+' '+raw.slice(amount.end):raw;
 if(dated)description=description.replace(dated[0],' ');
 description=description.replace(/\b(?:en|con|de|por)\s+(?:dinero\s+)?(?:efectivo|virtual|transferencia|mercado pago|tarjeta de d[eé]bito)\b/gi,' ').replace(/\b(?:efectivo|virtual|hoy|ayer|anteayer|pesos?|argentinos|centavos)\b/gi,' ').replace(/^\s*(?:gast[eé]|pagu[eé]|compr[eé]|gasto|registr[aá]|anot[aá])(?=\s|$)\s*/i,'').replace(/^\s*(?:en|de|por|con)\s+/i,'').replace(/[$]/g,' ').replace(/[,.]\s*$/,'').replace(/\s+/g,' ').trim();
 if(!description)description=categories.find(c=>c.id===categoryId)?.name||'Gasto por audio';
 description=description.charAt(0).toUpperCase()+description.slice(1);
 return {cents:amount?.cents??null,description:description.slice(0,100),date,location,categoryId,warnings};
}
