import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const layoutPath = path.join(root, 'src/components/Layout.tsx');
const cssPath = path.join(root, 'src/components/Layout.module.css');

let layout = fs.readFileSync(layoutPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

function replaceOnce(label, from, to) {
  if (!layout.includes(from)) throw new Error(`Header final v1 uygulanamadı: ${label}`);
  layout = layout.replace(from, to);
}

replaceOnce(
  'PB amblemi',
  `            <NavLink to="/" className={styles.brandMark} aria-label="PBYS Ana Sayfa"><span>PB</span></NavLink>\n`,
  ``
);

replaceOnce(
  'ana sayfa tarih saat',
  `              <p>{isHome ? \`${'${liveDate}'} · ${'${liveTime}'}\` : \`${'${activeSection?.label ?? \'PBYS\'}'} bölümü\`}</p>`,
  `              {isHome ? <p className={styles.desktopDateTime}><span>{liveDate}</span><strong>{liveTime}</strong></p> : <p>{\`${'${activeSection?.label ?? \'PBYS\'}'} bölümü\`}</p>}`
);

const cssPatch = `
/* desktop header final v1 */
@media(min-width:821px){
  .brandBlock{gap:0}
  .desktopDateTime{display:flex!important;flex-direction:column;align-items:flex-start;gap:2px;margin-top:5px!important}
  .desktopDateTime span{display:block;font-size:10px;line-height:1.2;color:#829095;font-weight:500}
  .desktopDateTime strong{display:block;font-size:11px;line-height:1.2;color:#62757b;font-weight:800;font-variant-numeric:tabular-nums}
}
`;

if (!css.includes('/* desktop header final v1 */')) css += cssPatch;

fs.writeFileSync(layoutPath, layout);
fs.writeFileSync(cssPath, css);
console.log('PB amblemi kaldırıldı; masaüstü ana sayfa tarih ve saat alt alta gösteriliyor.');
