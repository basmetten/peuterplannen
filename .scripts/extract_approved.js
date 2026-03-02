/**
 * Extract all score 8+ approved candidates (filtering snackbars/fast food/döner)
 */
const fs = require('fs');
const path = require('path');

const regions = ['Utrecht', 'Groningen', 'Bunnik', 'De Bilt', 'Zeist', 'Houten', 'Nieuwegein', 'IJsselstein', 'Woerden', 'Utrechtse Heuvelrug'];

const skipPatterns = [
  /mcdonald/i,
  /kwalitaria/i,
  /kebap/i, /kebab/i, /döner/i,
  /friet van piet/i,
  /cafetaria kerklaan/i,
  /bistro beiroet/i,
  /de pieper/i,
  /crazy bun/i,
];

const allApproved = [];

for (const region of regions) {
  const file = path.join('output', region + '_evaluated.json');
  if (!fs.existsSync(file)) { console.log('MISSING:', file); continue; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const item of data) {
    if (item.score >= 8 && item.supabase_ready) {
      const name = item.supabase_ready.name || '';
      const skip = skipPatterns.some(p => p.test(name));
      if (skip) {
        console.log('SKIP:', name, '(score', item.score + ')');
      } else {
        console.log('APPROVE:', name, '(score', item.score + ', region=' + item.supabase_ready.region + ')');
        allApproved.push({ region, score: item.score, data: item.supabase_ready });
      }
    }
  }
}

console.log('\nTotal approved:', allApproved.length);
fs.writeFileSync('output/all_approved.json', JSON.stringify(allApproved, null, 2));
