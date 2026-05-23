const fs = require('fs');

let content = fs.readFileSync('./src/catalog.jsx', 'utf8');

const regex = /export const GLASS_CATALOG_DATA = \[(.|\n)*?\];/m;
content = content.replace(regex, 'export const GLASS_CATALOG_DATA = [];');

fs.writeFileSync('./src/catalog.jsx', content, 'utf8');
console.log('Emptied GLASS_CATALOG_DATA');
