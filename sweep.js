const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
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

  // Replace legacy navy and harsh dark brown with the new rich walnut/wood brown
  content = content.replace(/#131643/gi, '#5C3A21');
  content = content.replace(/#180E06/gi, '#5C3A21');
  content = content.replace(/131643/g, '5C3A21');
  content = content.replace(/180E06/g, '5C3A21');

  // Replace glasstechfab string just in case
  content = content.replace(/glasstechfab/gi, 'westlinefuture');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced colors in ${changedCount} files.`);
