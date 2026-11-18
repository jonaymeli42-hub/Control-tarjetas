const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {key,unique}=require('../card-options.js');

test('card options deduplicate case, accents and repeated whitespace without changing the first label',()=>{
 const cards=unique(['Master Galicia Mia','MASTER GALICIA MIA',' Master   galicia mía ','Visa Galicia','VISA GALICIA','Naranja','']);
 assert.deepEqual(cards,['Master Galicia Mia','Visa Galicia','Naranja']);
 assert.equal(key('  VISA   BNA '),key('visa bna'));
});

test('card helper loads once before the app and is present in the offline shell',()=>{
 const html=fs.readFileSync('index.html','utf8');const sw=fs.readFileSync('sw.js','utf8');
 const helper=html.indexOf('<script src="card-options.js?v=1" defer></script>');
 const app=html.indexOf('app.js?v=shared-card-options-1');
 assert.ok(helper>=0&&app>helper);assert.equal(html.split('card-options.js?v=1').length-1,1);assert.ok(sw.includes("'./card-options.js?v=1'"));
});
