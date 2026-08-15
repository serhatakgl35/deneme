import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src/app/App.tsx');
const dashboardPath = path.join(root, 'src/pages/DashboardPage.tsx');

for (const [from, to] of [
  ['patches/team-today-v1/MyTeamTodayPage.tsx', 'src/pages/MyTeamTodayPage.tsx'],
  ['patches/team-today-v1/MyTeamTodayPage.module.css', 'src/pages/MyTeamTodayPage.module.css']
]) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  if (!fs.existsSync(src)) throw new Error(`Tim bugün yaması eksik: ${from}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

let app = fs.readFileSync(appPath, 'utf8');
const importFrom = `import { PendingLeaveApprovalsPage } from '../pages/PendingLeaveApprovalsPage';`;
const importTo = `${importFrom}\nimport { MyTeamTodayPage } from '../pages/MyTeamTodayPage';`;
if (!app.includes(importFrom)) throw new Error('Tim bugün sayfası için App import noktası bulunamadı.');
app = app.replace(importFrom, importTo);

const routeFrom = `        <Route path="/benim-izinlerim" element={<MyLeavesPage/>}/>`;
const routeTo = `${routeFrom}\n        <Route path="/timim-bugun" element={<MyTeamTodayPage/>}/>`;
if (!app.includes(routeFrom)) throw new Error('Tim bugün sayfası için route noktası bulunamadı.');
app = app.replace(routeFrom, routeTo);
fs.writeFileSync(appPath, app);

let dashboard = fs.readFileSync(dashboardPath, 'utf8');
const workFrom = `<SummaryCard to={showPersonnelOverview?'/yoklama':'/hesabim'} label="Çalışma"`;
const workTo = `<SummaryCard to={showPersonnelOverview?'/yoklama':'/timim-bugun'} label="Çalışma"`;
if (!dashboard.includes(workFrom)) throw new Error('Ana sayfa Çalışma kartı bulunamadı.');
dashboard = dashboard.replace(workFrom, workTo);
fs.writeFileSync(dashboardPath, dashboard);

console.log('Ana sayfa Çalışma kartı aynı timde bugün çalışan personel listesine bağlandı.');
