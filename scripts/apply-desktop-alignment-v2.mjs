import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const layoutPath = path.join(root, 'src/components/Layout.module.css');
let css = fs.readFileSync(layoutPath, 'utf8');

const patch = `
/* desktop alignment v2 */
@media(min-width:821px){
  :global(html),:global(body),:global(#root){width:100%;max-width:none;margin:0;padding:0;box-sizing:border-box}
  :global(#root){text-align:left}
  :global(body){display:block!important;min-width:320px}
  .shell,.main{width:100%;max-width:none;margin:0;padding:0}
  .topbarInner,.moduleNavInner,.content{width:100%;max-width:1380px;margin-left:auto;margin-right:auto;box-sizing:border-box}
  .topbarInner{padding-left:24px;padding-right:24px}
  .moduleNavInner{padding-left:24px;padding-right:24px}
  .content{padding-left:24px;padding-right:24px}
}
@media(min-width:821px) and (max-width:1180px){
  .topbarInner,.moduleNavInner,.content{max-width:100%}
}
`;

if (!css.includes('/* desktop alignment v2 */')) css += patch;
fs.writeFileSync(layoutPath, css);
console.log('PBYS masaüstü ana gövdesi ortalandı ve sağa yaslanma giderildi.');
