import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dashboardPath = path.join(root, 'src/pages/DashboardPage.tsx');
let source = fs.readFileSync(dashboardPath, 'utf8');

const oldFormula = `  const ready=sumStatuses(counts,['present','work','watch']);`;
const newFormula = `  const ready=Math.max(0,total-present-annual-medical-dayLeave);`;

if (!source.includes(oldFormula) && !source.includes(newFormula)) {
  throw new Error('Hazır personel formülü bulunamadı.');
}
source = source.replace(oldFormula, newFormula);
source = source.replace('<MiniStat label="İzinli" value={leaveTotal}/>', '<MiniStat label="Yıllık İzin" value={annual}/>');

fs.writeFileSync(dashboardPath, source);
console.log('PBYS ana sayfa Hazır sayısı kalan personel olarak güncellendi.');
