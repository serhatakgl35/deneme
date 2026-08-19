import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const copies = [
  ['patches/day-leave-return-v1/MyLeavesPage.tsx', 'src/pages/MyLeavesPage.tsx'],
  ['patches/day-leave-return-v1/ApprovedLeavesPage.tsx', 'src/pages/ApprovedLeavesPage.tsx'],
  ['patches/day-leave-return-v1/DayLeaveReturnCamera.tsx', 'src/components/DayLeaveReturnCamera.tsx'],
  ['patches/day-leave-return-v1/DayLeaveReturnPhotoModal.tsx', 'src/components/DayLeaveReturnPhotoModal.tsx'],
  ['patches/day-leave-return-v1/DayLeaveReturn.module.css', 'src/components/DayLeaveReturn.module.css'],
  ['patches/day-leave-return-v1/dayLeaveReturn.ts', 'src/lib/dayLeaveReturn.ts']
];

for (const [sourceRelative, targetRelative] of copies) {
  const source = path.join(root, sourceRelative);
  const target = path.join(root, targetRelative);
  if (!fs.existsSync(source)) throw new Error(`Günübirlik dönüş yaması eksik: ${sourceRelative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

console.log('PBYS günübirlik izin fotoğraflı dönüş v1 uygulandı.');
