const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace remaining legacy colors
  content = content.replace(/rgba\(19,\s*22,\s*67/g, 'rgba(92, 58, 33');
  content = content.replace(/#9B99C8/gi, '#A89885');
  content = content.replace(/#F8F8FD/gi, '#F9F6F0');
  content = content.replace(/#E8E6F5/gi, '#EAE0D5');
  content = content.replace(/#5B5894/gi, '#8B7355');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced remaining colors in ${changedCount} files.`);
