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

  content = content.replace(/'#FDFCFB'/gi, '`var(--bg-primary)`');
  content = content.replace(/"#FDFCFB"/gi, '`var(--bg-primary)`');
  content = content.replace(/#FDFCFB/gi, 'var(--bg-primary)');
  
  content = content.replace(/'#F4EFE6'/gi, '`var(--bg-secondary)`');
  content = content.replace(/"#F4EFE6"/gi, '`var(--bg-secondary)`');
  content = content.replace(/#F4EFE6/gi, 'var(--bg-secondary)');
  
  content = content.replace(/'#F9F6F0'/gi, '`var(--bg-secondary)`');
  content = content.replace(/"#F9F6F0"/gi, '`var(--bg-secondary)`');
  content = content.replace(/#F9F6F0/gi, 'var(--bg-secondary)');
  
  content = content.replace(/'#2C1A0F'/gi, '`var(--text-primary)`');
  content = content.replace(/"#2C1A0F"/gi, '`var(--text-primary)`');
  content = content.replace(/#2C1A0F/gi, 'var(--text-primary)');
  
  content = content.replace(/'#8B5A2B'/gi, '`var(--text-secondary)`');
  content = content.replace(/"#8B5A2B"/gi, '`var(--text-secondary)`');
  content = content.replace(/#8B5A2B/gi, 'var(--text-secondary)');
  
  content = content.replace(/'#A89885'/gi, '`var(--text-secondary)`');
  content = content.replace(/"#A89885"/gi, '`var(--text-secondary)`');
  content = content.replace(/#A89885/gi, 'var(--text-secondary)');
  
  content = content.replace(/'#8B7355'/gi, '`var(--text-secondary)`');
  content = content.replace(/"#8B7355"/gi, '`var(--text-secondary)`');
  content = content.replace(/#8B7355/gi, 'var(--text-secondary)');
  
  content = content.replace(/'#C88F43'/gi, '`var(--accent-primary)`');
  content = content.replace(/"#C88F43"/gi, '`var(--accent-primary)`');
  content = content.replace(/#C88F43/gi, 'var(--accent-primary)');
  
  content = content.replace(/'#5C3A21'/gi, '`var(--accent-secondary)`');
  content = content.replace(/"#5C3A21"/gi, '`var(--accent-secondary)`');
  content = content.replace(/#5C3A21/gi, 'var(--accent-secondary)');
  
  content = content.replace(/'#EAE0D5'/gi, '`var(--border-color)`');
  content = content.replace(/"#EAE0D5"/gi, '`var(--border-color)`');
  content = content.replace(/#EAE0D5/gi, 'var(--border-color)');
  
  content = content.replace(/'#100904'/gi, '`var(--footer-bg)`');
  content = content.replace(/"#100904"/gi, '`var(--footer-bg)`');
  content = content.replace(/#100904/gi, 'var(--footer-bg)');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced hardcoded hex with CSS variables in ${changedCount} files.`);
