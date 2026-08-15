import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './Layout.module.css';
import previewStyles from './RolePreview.module.css';

type IconName = 'home'|'users'|'shield'|'clipboard'|'calendar'|'calendarDays'|'star'|'folder'|'menuFood'|'utensils'|'wallet'|'laundry'|'chart'|'lock'|'settings'|'swap'|'database'|'bell';
type NavItem = { to: string; icon: IconName; label: string; roles?: string[] };
type NavSection = { key: string; label: string; icon: IconName; items: NavItem[] };
type PreviewRoleValue = 'staff'|'team_commander'|'cook'|'tabldot'|'administrative'|'commander';

const homeItem: NavItem = { to: '/', icon: 'home', label: 'Ana Sayfa' };

const sections: NavSection[] = [
  { key: 'personel', label: 'Personel', icon: 'users', items: [
    { to: '/personel', icon: 'users', label: 'Personel Listesi', roles: ['admin','commander','administrative','team_commander'] }
  ]},
  { key: 'izinler', label: 'İzinler', icon: 'calendar', items: [
    { to: '/izin', icon: 'calendar', label: 'İzin İşlemleri' },
    { to: '/izin-gecmisi', icon: 'folder', label: 'İzin / Rapor Geçmişi', roles: ['admin','administrative'] },
    { to: '/izin-takvimi', icon: 'calendarDays', label: 'İzin Takvimi', roles: ['admin','commander','administrative','team_commander'] },
    { to: '/izin-planlama', icon: 'star', label: 'Yıllık İzin Planlama' }
  ]},
  { key: 'calisma', label: 'Çalışma / Vardiya', icon: 'shield', items: [
    { to: '/tim-vardiya', icon: 'shield', label: 'Tim / Vardiya', roles: ['admin','commander','administrative','team_commander'] },
    { to: '/yoklama', icon: 'clipboard', label: 'Yoklama', roles: ['admin','commander','administrative','team_commander'] }
  ]},
  { key: 'yemek', label: 'Yemek / Tabldot', icon: 'utensils', items: [
    { to: '/gunluk-menu', icon: 'menuFood', label: 'Günlük Menü' },
    { to: '/yemek', icon: 'utensils', label: 'Yemek Durumu' },
    { to: '/borc-odemeler', icon: 'wallet', label: 'Borç / Ödemeler' },
    { to: '/tabldot-odemeler', icon: 'wallet', label: 'Ödeme Onayları', roles: ['admin','tabldot'] }
  ]},
  { key: 'faaliyet', label: 'Faaliyetler', icon: 'folder', items: [
    { to: '/duyurular', icon: 'bell', label: 'Duyurular / Yaklaşanlar' },
    { to: '/faaliyetler', icon: 'folder', label: 'Haftalık Faaliyet Takvimi' }
  ]},
  { key: 'camasir', label: 'Çamaşırhane', icon: 'laundry', items: [
    { to: '/camasirhane', icon: 'laundry', label: 'Çamaşırhane' }
  ]},
  { key: 'rapor', label: 'Raporlar', icon: 'chart', items: [
    { to: '/raporlar', icon: 'chart', label: 'Raporlar', roles: ['admin','commander','administrative','tabldot'] }
  ]},
  { key: 'hesap', label: 'Hesabım', icon: 'lock', items: [
    { to: '/hesabim', icon: 'lock', label: 'Hesabım' }
  ]}
];

const adminSection: NavSection = { key: 'yonetim', label: 'Yönetim', icon: 'settings', items: [
  { to: '/kullanicilar', icon: 'settings', label: 'Kullanıcı Yönetimi' },
  { to: '/tabldot-ayarlari', icon: 'wallet', label: 'Tabldot Kapsam Ayarları' },
  { to: '/veri-gecisi', icon: 'swap', label: 'Veri Geçişi' },
  { to: '/yedekleme', icon: 'database', label: 'Yedekleme' }
]};

const previewOptions: { value: PreviewRoleValue; label: string }[] = [
  { value: 'staff', label: 'Personel' },
  { value: 'team_commander', label: 'Tim Komutanı' },
  { value: 'cook', label: 'Aşçı' },
  { value: 'tabldot', label: 'Tabldot Sorumlusu' },
  { value: 'administrative', label: 'İdari İşler' },
  { value: 'commander', label: 'Karakol Komutanı' }
];

function NavGlyph({ name }: { name: IconName }) {
  let shape: ReactNode;
  switch (name) {
    case 'home': shape = <><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>; break;
    case 'users': shape = <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-3.8 2.6-6 5.5-6s5 2.2 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.2 15c3-.7 5.1 1.3 5.5 4.6"/></>; break;
    case 'shield': shape = <><path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-5"/></>; break;
    case 'clipboard': shape = <><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M9 10h6M9 14h6M9 18h4"/></>; break;
    case 'calendar': shape = <><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17M8 13h3M13 13h3M8 17h3"/></>; break;
    case 'calendarDays': shape = <><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17"/><circle cx="8" cy="13" r=".8" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r=".8" fill="currentColor" stroke="none"/><circle cx="16" cy="13" r=".8" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r=".8" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/></>; break;
    case 'star': shape = <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6-4.3-4.2 6-.9L12 3Z"/>; break;
    case 'folder': shape = <><path d="M3.5 6.5h6l2 2h9v10.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6.5Z"/><path d="M3.5 10h17"/></>; break;
    case 'menuFood': shape = <><path d="M4 15h16M6 15a6 6 0 0 1 12 0M12 7V5"/><path d="M5 19h14"/></>; break;
    case 'utensils': shape = <><path d="M6 3v7M3.8 3v5.5A2.2 2.2 0 0 0 6 10.7a2.2 2.2 0 0 0 2.2-2.2V3M6 10.7V21M16 3v18M16 3c3 1.8 4.2 5 3.2 8H16"/></>; break;
    case 'wallet': shape = <><path d="M4 6.5h13.5A2.5 2.5 0 0 1 20 9v9a2.5 2.5 0 0 1-2.5 2H5a2 2 0 0 1-2-2V6.5a2.5 2.5 0 0 1 2.5-2H17"/><path d="M15 12h5v4h-5a2 2 0 1 1 0-4Z"/></>; break;
    case 'laundry': shape = <><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M7 6h2M12 6h1"/></>; break;
    case 'chart': shape = <><path d="M4 20V4M4 20h16"/><path d="M8 17v-5M12 17V8M16 17v-8M20 17V6"/></>; break;
    case 'lock': shape = <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>; break;
    case 'settings': shape = <><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="7"/></>; break;
    case 'swap': shape = <><path d="M4 7h13l-3-3M20 17H7l3 3"/><path d="m17 7-3 3M7 17l3-3"/></>; break;
    case 'database': shape = <><ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></>; break;
    case 'bell': shape = <><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 20h4"/></>; break;
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shape}</svg>;
}

function formatLiveDate(now: Date) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now);
}
function formatLiveTime(now: Date) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
}
function itemVisible(item: NavItem, roles: string[]) {
  return !item.roles || item.roles.some(role => roles.includes(role));
}

export function Layout() {
  const { account, realAccount, previewRole, isRolePreview, setPreviewRole, signOut } = useAuth();
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());
  const isAdmin = account.roles.includes('admin');
  const realIsAdmin = realAccount.roles.includes('admin');

  const visibleSections = useMemo(() => {
    const base = sections
      .map(section => ({ ...section, items: section.items.filter(item => itemVisible(item, account.roles)) }))
      .filter(section => section.items.length > 0);
    return isAdmin ? [...base, adminSection] : base;
  }, [account.roles, isAdmin]);

  const visibleItems = useMemo(() => [homeItem, ...visibleSections.flatMap(section => section.items)], [visibleSections]);
  const displayName = realAccount.fullName || realAccount.phone || 'PBYS Kullanıcısı';
  const currentItem = visibleItems.slice().sort((a,b)=>b.to.length-a.to.length).find(item => item.to==='/' ? location.pathname==='/' : location.pathname===item.to || location.pathname.startsWith(`${item.to}/`));
  const currentTitle = currentItem?.label ?? 'PBYS';
  const previewLabel = previewOptions.find(item => item.value === previewRole)?.label ?? '';
  const isHome = location.pathname === '/';
  const liveDate = useMemo(() => formatLiveDate(now), [now]);
  const liveTime = useMemo(() => formatLiveTime(now), [now]);
  const activeSection = visibleSections.find(section => section.items.some(item => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))) ?? null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return <div className={styles.shell}>
    <main className={styles.main}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brandBlock}>
            <NavLink to="/" className={styles.brandMark} aria-label="PBYS Ana Sayfa"><span>PB</span></NavLink>
            <div className={styles.titleBlock}>
              <span className={styles.eyebrow}>PBYS · PERSONEL BİLGİ YÖNETİM SİSTEMİ</span>
              <h1>{isHome ? `Hoş geldiniz ${displayName}` : currentTitle}</h1>
              <p>{isHome ? 'İhtiyacınız olan bölümü seçin.' : `${activeSection?.label ?? 'PBYS'} bölümü`}</p>
            </div>
          </div>

          <div className={styles.topbarRight}>
            <div className={styles.liveClock} aria-label={`Güncel tarih ve saat: ${liveDate}, ${liveTime}`}><span>{liveDate}</span><strong>{liveTime}</strong></div>
            {realIsAdmin ? <label className={previewStyles.previewControl}><span>Rol Önizleme</span><select value={previewRole??''} onChange={event=>setPreviewRole((event.target.value||null) as PreviewRoleValue|null)} aria-label="Rol önizleme"><option value="">Gerçek Admin</option>{previewOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
            <NavLink to="/hesabim" className={styles.userPill}><span className={styles.userDot}/><div><strong>{displayName}</strong><small>{realAccount.rankTitle||realAccount.phone}</small></div></NavLink>
            <button className={styles.logoutButton} onClick={()=>void signOut()}>Çıkış</button>
          </div>
        </div>
      </header>

      {!isHome && activeSection ? <nav className={styles.moduleNav} aria-label={`${activeSection.label} menüsü`}>
        <div className={styles.moduleNavInner}>
          <NavLink to="/" className={styles.homeBack}><NavGlyph name="home"/><span>Ana Sayfa</span></NavLink>
          <span className={styles.moduleDivider}/>
          <span className={styles.moduleName}><NavGlyph name={activeSection.icon}/>{activeSection.label}</span>
          <div className={styles.moduleLinks}>{activeSection.items.map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>`${styles.moduleLink} ${isActive?styles.moduleLinkActive:''}`}><span>{item.label}</span></NavLink>)}</div>
        </div>
      </nav> : null}

      {isRolePreview ? <div className={previewStyles.previewBanner}><strong>Salt Okunur Önizleme · {previewLabel}</strong><span>Menü ve sayfa görünümü seçilen role göre gösteriliyor; kayıt işlemleri kilitli.</span></div> : null}
      <div className={`${styles.content} ${isRolePreview?previewStyles.previewLocked:''}`}><Outlet/></div>
    </main>
  </div>;
}
