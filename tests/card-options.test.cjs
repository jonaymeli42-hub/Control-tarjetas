const test=require('node:test');const assert=require('node:assert/strict');const {key,unique}=require('../card-options.js');
test('card options deduplicate case, accents and repeated whitespace without changing the first label',()=>{
 const cards=unique(['Master Galicia Mia','MASTER GALICIA MIA',' Master   galicia mía ','Visa Galicia','VISA GALICIA','Naranja','']);
 assert.deepEqual(cards,['Master Galicia Mia','Visa Galicia','Naranja']);
 assert.equal(key('  VISA   BNA '),key('visa bna'));
});
