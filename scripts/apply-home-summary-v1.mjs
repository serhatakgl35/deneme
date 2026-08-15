import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dashboardPath = path.join(root, 'src/pages/DashboardPage.tsx');
const layoutPath = path.join(root, 'src/components/Layout.tsx');
const layoutCssPath = path.join(root, 'src/components/Layout.module.css');

let dashboard = fs.readFileSync(dashboardPath, 'utf8');
let layout = fs.readFileSync(layoutPath, 'utf8');
let layoutCss = fs.readFileSync(layoutCssPath, 'utf8');

const managerCardFrom = '        <Link to="/personel" className={`${styles.summaryCard} ${styles.summaryLink} ${styles.summaryEmphasis} ${styles.personnelSummaryCard}`}>');
const managerCardTo = '        <Link to="/yoklama" className={`${styles.summaryCard} ${styles.summaryLink} ${styles.summaryEmphasis} ${styles.personnelSummaryCard}`}>');
if (!dashboard.includes(managerCardFrom)) throw new Error('Ana sayfa personel kartı bağlantısı bulunamadı.');
dashboard = dashboard.replace(managerCardFrom, managerCardTo);

const homeSubtitleFrom = "              <p>{isHome ? 'İhtiyacınız olan bölümü seçin.' : `${activeSection?.label ?? 'PBYS'} bölümü`}</p>";
const homeSubtitleTo = "              <p>{isHome ? `${liveDate} · ${liveTime}` : `${activeSection?.label ?? 'PBYS'} bölümü`}</p>";
if (!layout.includes(homeSubtitleFrom)) throw new Error('Ana sayfa karşılama alt metni bulunamadı.');
layout = layout.replace(homeSubtitleFrom, homeSubtitleTo);

const mobilePatch = `\n/* home date-time under greeting */\n@media(max-width:820px){.titleBlock p{display:block;margin:3px 0 0;font-size:9px;line-height:1.2;color:#7f8c8e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.topbarInner{align-items:start}.topbarRight{align-items:flex-start}}\n@media(max-width:460px){.titleBlock p{font-size:8.5px;margin-top:3px}}\n`;
if (!layoutCss.includes('/* home date-time under greeting */')) layoutCss += mobilePatch;

fs.writeFileSync(dashboardPath, dashboard);
fs.writeFileSync(layoutPath, layout);
fs.writeFileSync(layoutCssPath, layoutCss);
console.log('Ana sayfa personel kartı Yoklama sayfasına bağlandı; karşılama altına tarih/saat eklendi.');
