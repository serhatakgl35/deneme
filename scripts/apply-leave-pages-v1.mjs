import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();

function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function write(rel,content){fs.writeFileSync(path.join(root,rel),content);}
function replaceOnce(source,label,from,to){
  if(!source.includes(from)) throw new Error(`İzin sayfaları v1 yaması uygulanamadı: ${label}`);
  return source.replace(from,to);
}

const copies=[
  ['patches/leave-v1/PendingLeaveApprovalsPage.tsx','src/pages/PendingLeaveApprovalsPage.tsx'],
  ['patches/leave-v1/MyLeavesPage.tsx','src/pages/MyLeavesPage.tsx']
];
for(const [from,to] of copies){
  const src=path.join(root,from); const dest=path.join(root,to);
  if(!fs.existsSync(src)) throw new Error(`Eksik izin sayfası: ${from}`);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(src,dest);
}

let app=read('src/app/App.tsx');
app=replaceOnce(app,'App imports',
`import { LeaveHistoryPage } from '../pages/LeaveHistoryPage';`,
`import { LeaveHistoryPage } from '../pages/LeaveHistoryPage';
import { MyLeavesPage } from '../pages/MyLeavesPage';
import { PendingLeaveApprovalsPage } from '../pages/PendingLeaveApprovalsPage';`);
app=replaceOnce(app,'App routes',
`        <Route path="/izin" element={<LeaveEntryPage/>}/>
        <Route path="/izin-gecmisi" element={<RoleGuard roles={['administrative']}><LeaveHistoryPage/></RoleGuard>}/>` ,
`        <Route path="/izin" element={<LeaveEntryPage/>}/>
        <Route path="/izin-onaylari" element={<RoleGuard roles={['commander']}><PendingLeaveApprovalsPage/></RoleGuard>}/>
        <Route path="/benim-izinlerim" element={<MyLeavesPage/>}/>
        <Route path="/izin-gecmisi" element={<RoleGuard roles={['administrative']}><LeaveHistoryPage/></RoleGuard>}/>`);
write('src/app/App.tsx',app);

let layout=read('src/components/Layout.tsx');
layout=replaceOnce(layout,'İzin menüsü',
`  { key: 'izinler', label: 'İzinler', icon: 'calendar', items: [
    { to: '/izin', icon: 'calendar', label: 'İzin İşlemleri' },
    { to: '/izin-gecmisi', icon: 'folder', label: 'İzin / Rapor Geçmişi', roles: ['admin','administrative'] },
    { to: '/izin-takvimi', icon: 'calendarDays', label: 'İzin Takvimi', roles: ['admin','commander','administrative','team_commander'] },
    { to: '/izin-planlama', icon: 'star', label: 'Yıllık İzin Planlama' }
  ]},`,
`  { key: 'izinler', label: 'İzinler', icon: 'calendar', items: [
    { to: '/izin', icon: 'calendar', label: 'İzin Talebi', roles: ['admin','administrative','team_commander','staff','cook','tabldot'] },
    { to: '/izin-onaylari', icon: 'calendarDays', label: 'Onay Bekleyen İzinler', roles: ['admin','commander'] },
    { to: '/benim-izinlerim', icon: 'folder', label: 'Benim İzinlerim' },
    { to: '/izin-gecmisi', icon: 'folder', label: 'İzin / Rapor Geçmişi', roles: ['admin','administrative'] },
    { to: '/izin-takvimi', icon: 'calendarDays', label: 'İzin Takvimi', roles: ['admin','commander','administrative','team_commander'] },
    { to: '/izin-planlama', icon: 'star', label: 'Yıllık İzin Planlama' }
  ]},`);
write('src/components/Layout.tsx',layout);

let leave=read('src/pages/LeavePage.tsx');
leave=replaceOnce(leave,'Sayfa başlığı',
`    <div className={styles.pageHead}>
      <div><h2>İzin Yönetimi</h2><p>İzin talebi, onay ve geçmiş kayıtları Supabase üzerinde tek akışta tutulur.</p></div>
    </div>`,
`    <div className={styles.pageHead}>
      <div><h2>İzin İşlemleri</h2></div>
    </div>`);
leave=leave.replace(`\n    <div className={styles.infoBox}><strong>Bakiye kuralı:</strong> Geçmiş sistemden taşınan kullanım günleri korunur. Onaylı gelecek izinler, günü tamamlanmadan “kullanılmış” bakiyeye düşmez.</div>`,'');
leave=leave.replace(`\n    <div className={styles.infoBox}><strong>Bağlantı:</strong> Bir izin Karakol Komutanı/Admin tarafından onaylandığı anda Yoklama ve Tim/Vardiya ekranında o tarih aralığı için otomatik olarak en yüksek öncelikli durum olur.</div>`,'');
leave=leave.replace(`\n      {isCommander && canManage ? <div className={styles.infoBox}>Karakol Komutanı rolü nedeniyle bu yönetim formunda kendi adınıza yeni izin talebi oluşturamazsınız.</div> : null>`,'');
leave=leave.replace(` : <div className={styles.infoBox}>Karakol Komutanı rolünde kişisel “Yeni İzin Talebi” bulunmaz; bu ekran izin taleplerini inceleme ve onaylama için kullanılır.</div>}`,' : null}');
leave=replaceOnce(leave,'Kayıt başlığı',
`      <div className={styles.sectionTitle}><h3>{canApprove ? 'İzin Talepleri ve Geçmiş' : 'İzin Kayıtlarım'}</h3></div>`,
`      <div className={styles.sectionTitle}><h3>{canManage || canApprove ? 'İzin Kayıtları' : 'İzin Kayıtlarım'}</h3></div>`);
leave=leave.replace(`\n                {row.status === 'pending' && canApprove ? <><button className={styles.approve} disabled={busy} onClick={() => void decide(row, 'approved')}>Onayla</button><button className={styles.danger} disabled={busy} onClick={() => void decide(row, 'rejected')}>Reddet</button></> : null>`,'');
write('src/pages/LeavePage.tsx',leave);

let dashboard=read('src/pages/DashboardPage.tsx');
dashboard=dashboard.replace(`<Link to="/izin" className={styles.priorityStrip}>`,`<Link to="/izin-onaylari" className={styles.priorityStrip}>`);
dashboard=dashboard.replace(`<Link to="/izin" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${pendingLeaves.length?styles.leaveAlertCard:\'\'}'}\`}>`,`<Link to="/izin-onaylari" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${pendingLeaves.length?styles.leaveAlertCard:\'\'}'}\`}>`);
dashboard=replaceOnce(dashboard,'İzin işlem merkezi bağlantıları',
`            <HubLink to="/izin" icon="leave" title="İzin İşlemleri" detail="Yeni talep ve onay süreci" meta={canApprove&&pendingLeaves.length?\`${'${pendingLeaves.length}'} bekleyen\`:undefined}/>` ,
`            {canApprove?<HubLink to="/izin-onaylari" icon="leave" title="Onay Bekleyen İzinler" detail="Sadece onay bekleyen talepler" meta={pendingLeaves.length?\`${'${pendingLeaves.length}'} bekleyen\`:undefined}/>:null}
            {!isCommander?<HubLink to="/izin" icon="leave" title="İzin Talebi" detail="Yeni izin talebi oluştur"/>:null}
            <HubLink to="/benim-izinlerim" icon="history" title="Benim İzinlerim" detail="Kendi izin kayıtlarınızı görüntüleyin"/>`);
write('src/pages/DashboardPage.tsx',dashboard);

console.log('PBYS ayrı izin sayfaları v1 uygulandı.');
