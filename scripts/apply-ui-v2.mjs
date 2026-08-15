import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const copies = [
  ['patches/ui-v2/Layout.tsx', 'src/components/Layout.tsx'],
  ['patches/ui-v2/Layout.module.css', 'src/components/Layout.module.css'],
  ['patches/ui-v2/DashboardPage.tsx', 'src/pages/DashboardPage.tsx'],
  ['patches/ui-v2/DashboardPage.module.css', 'src/pages/DashboardPage.module.css'],
];

for (const [sourceRelative, targetRelative] of copies) {
  const source = path.join(root, sourceRelative);
  const target = path.join(root, targetRelative);
  if (!fs.existsSync(source)) throw new Error(`PBYS UI v2 yaması eksik: ${sourceRelative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

console.log(`PBYS sade arayüz v2 uygulandı: ${copies.length} dosya.`);
