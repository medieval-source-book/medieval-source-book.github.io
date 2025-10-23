#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const repoRoot = path.resolve(__dirname, '..', '..');

function listFiles(dir, exts = ['.md', '.html']){
  let results = [];
  for(const name of fs.readdirSync(dir)){
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if(stat.isDirectory()){
      // skip node_modules and .git
      if(name === 'node_modules' || name === '.git') continue;
      results = results.concat(listFiles(full, exts));
    } else {
      if(exts.includes(path.extname(full))) results.push(full);
    }
  }
  return results;
}

function main(){
  console.log('Scanning for duplicate permalinks...');
  const files = listFiles(repoRoot);
  const map = new Map();

  for(const f of files){
    // skip the 11ty folder itself
    if(f.includes(path.join(repoRoot, '11ty'))) continue;
    try{
      const src = fs.readFileSync(f, 'utf8');
      const fm = matter(src);
      const permalink = fm.data && fm.data.permalink;
      if(permalink){
        const list = map.get(permalink) || [];
        list.push(f);
        map.set(permalink, list);
      }
    } catch(e) {
      // ignore parse errors
    }
  }

  let changed = 0;
  for(const [permalink, paths] of map.entries()){
    if(paths.length <= 1) continue;
    // choose keeper: prefer file under _texts/
    let keeper = paths.find(p => p.includes(path.sep + '_texts' + path.sep));
    if(!keeper) keeper = paths.find(p => !p.includes('_yaml') && !p.includes('original')) || paths[0];

    for(const p of paths){
      if(p === keeper) continue;
      // read, parse, remove permalink key
      const src = fs.readFileSync(p, 'utf8');
      const fm = matter(src);
      if(fm.data && Object.prototype.hasOwnProperty.call(fm.data, 'permalink')){
        delete fm.data.permalink;
        const out = matter.stringify(fm.content, fm.data, { lineWidth: 10000 });
        fs.writeFileSync(p, out, 'utf8');
        console.log('Cleared permalink in', path.relative(repoRoot, p));
        changed++;
      }
    }
  }

  console.log(`Done. Files changed: ${changed}`);
}

main();
