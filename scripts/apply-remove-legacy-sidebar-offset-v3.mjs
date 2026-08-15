import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src/styles/fixedSidebar.css');
let css = fs.readFileSync(file, 'utf8');

const patch = `

/* PBYS yeni üst-menü düzeni: eski sabit sidebar masaüstü ofsetini iptal et. */
@media (min-width: 761px) {
  main[class*="main"] {
    width: 100% !important;
    margin-left: 0 !important;
    max-width: none !important;
  }
}
`;

if (!css.includes('PBYS yeni üst-menü düzeni: eski sabit sidebar masaüstü ofsetini iptal et.')) {
  css += patch;
}

fs.writeFileSync(file, css);
console.log('Eski 288/244px sidebar masaüstü ofseti kaldırıldı.');
