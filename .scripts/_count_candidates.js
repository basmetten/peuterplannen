const fs = require('fs');
const regions = ['Den Haag','Delft','Westland','Rijswijk','Zoetermeer','Wassenaar','Leidschendam-Voorburg','Pijnacker-Nootdorp'];
let total=0, withKw=0, extraEval=0;
for (const r of regions) {
  const data = JSON.parse(fs.readFileSync('output/stage2_'+r+'.json','utf8'));
  const hasKw = data.filter(c => c.scrape && c.scrape.keywords && c.scrape.keywords.length > 0);
  const extra = data.filter(c => {
    if (c.scrape && c.scrape.keywords && c.scrape.keywords.length > 0) return false;
    const name = (c.name||'').toLowerCase();
    const cuisine = (c.cuisine||'').toLowerCase();
    return name.includes('pannenkoek') || cuisine.includes('pancake') || c.amenity === 'ice_cream';
  });
  console.log(r+': '+data.length+' totaal, '+hasKw.length+' met keywords, '+extra.length+' extra (pannenkoek/ijs)');
  total+=data.length; withKw+=hasKw.length; extraEval+=extra.length;
}
console.log('\nTOTAAL:', total, '| met keywords:', withKw, '| extra:', extraEval, '| TE EVALUEREN:', withKw+extraEval);
