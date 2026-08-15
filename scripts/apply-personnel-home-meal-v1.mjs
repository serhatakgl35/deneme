import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dashboardPath = path.join(root, 'src/pages/DashboardPage.tsx');
const layoutPath = path.join(root, 'src/components/Layout.tsx');
const layoutCssPath = path.join(root, 'src/components/Layout.module.css');

let dashboard = fs.readFileSync(dashboardPath, 'utf8');
let layout = fs.readFileSync(layoutPath, 'utf8');
let layoutCss = fs.readFileSync(layoutCssPath, 'utf8');

function replaceOnce(source, label, from, to) {
  if (!source.includes(from)) throw new Error(`Personel ana sayfa v1 yaması uygulanamadı: ${label}`);
  return source.replace(from, to);
}

// Menü ve kişisel yemek tercihi sadece yönetici hesaplarda değil, her personelde yüklensin.
dashboard = replaceOnce(
  dashboard,
  'menü ve tercih yükleme',
  `      const menuPromise=canApprove?supabase.from('daily_menus').select('menu_date,breakfast,dinner').eq('menu_date',date).maybeSingle():Promise.resolve({data:null,error:null});\n      const mealPromise=canApprove&&account.personnelId?supabase.from('meal_selections').select('meal,selection').eq('personnel_id',account.personnelId).eq('meal_date',date):Promise.resolve({data:[],error:null});`,
  `      const menuPromise=supabase.from('daily_menus').select('menu_date,breakfast,dinner').eq('menu_date',date).maybeSingle();\n      const mealPromise=account.personnelId?supabase.from('meal_selections').select('meal,selection').eq('personnel_id',account.personnelId).eq('meal_date',date):Promise.resolve({data:[],error:null});`
);

// Personel ana sayfasındaki basit Yemek / Tabldot kartını yönetici kartındaki gibi menü + tercih görünümüne çevir.
dashboard = replaceOnce(
  dashboard,
  'personel yemek kartı',
  `        <SummaryCard to="/yemek" label="Yemek / Tabldot" value={!showPersonnelOverview&&totalTabldotRemaining>0?money(totalTabldotRemaining):'Sabah + Akşam'} detail={!showPersonnelOverview&&totalTabldotRemaining>0?'Kalan tabldot borcu':'Günlük iki öğün takibi'}/>`,
  `        <Link to="/yemek" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${styles.mealSummaryCard}'}\`}>\n          <span>Yemek Menüsü & Tercihim</span>\n          <div className={styles.mealOverviewGrid}>\n            <div><b>Sabah</b><strong>{menu?.breakfast||'Menü girilmedi'}</strong><em>{mealPreference('breakfast')}</em></div>\n            <div><b>Akşam</b><strong>{menu?.dinner||'Menü girilmedi'}</strong><em>{mealPreference('dinner')}</em></div>\n          </div>\n          <small>Menüyü görüntüle veya yemek tercihini değiştir →</small>\n        </Link>`
);

// Mobilde tarih/saat için ayrı, gizlenemeyecek bir satır kullan.
layout = replaceOnce(
  layout,
  'mobil tarih saat satırı',
  `              <h1>{isHome ? \`Hoş geldiniz ${'${displayName}'}\` : currentTitle}</h1>\n              <p>{isHome ? \`${'${liveDate}'} · ${'${liveTime}'}\` : \`${'${activeSection?.label ?? \'PBYS\'}'} bölümü\`}</p>`,
  `              <h1>{isHome ? \`Hoş geldiniz ${'${displayName}'}\` : currentTitle}</h1>\n              {isHome ? <span className={styles.mobileDateTime}>{liveDate} · {liveTime}</span> : null}\n              <p>{isHome ? \`${'${liveDate}'} · ${'${liveTime}'}\` : \`${'${activeSection?.label ?? \'PBYS\'}'} bölümü\`}</p>`
);

const cssPatch = `\n/* mobile home date-time v2 */\n.mobileDateTime{display:none}\n@media(max-width:820px){.mobileDateTime{display:block;margin-top:4px;font-size:9px;line-height:1.2;color:#6f7f83;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.titleBlock p{display:none!important}}\n@media(max-width:460px){.mobileDateTime{font-size:8.5px;margin-top:3px}}\n`;
if (!layoutCss.includes('/* mobile home date-time v2 */')) layoutCss += cssPatch;

fs.writeFileSync(dashboardPath, dashboard);
fs.writeFileSync(layoutPath, layout);
fs.writeFileSync(layoutCssPath, layoutCss);
console.log('Personel ana sayfasına menü/tercih kartı ve mobil tarih/saat v1 uygulandı.');
