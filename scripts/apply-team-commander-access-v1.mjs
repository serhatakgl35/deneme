import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, content){ fs.writeFileSync(path.join(root, rel), content); }

function ensureRoleOnRoute(source, routePath, role){
  const routeIndex = source.indexOf(`path="${routePath}"`);
  if(routeIndex < 0) throw new Error(`Tim Komutanı erişim yaması: route bulunamadı (${routePath})`);
  const routeEnd = source.indexOf('/>', routeIndex);
  if(routeEnd < 0) throw new Error(`Tim Komutanı erişim yaması: route kapanışı bulunamadı (${routePath})`);
  const rolesStart = source.indexOf('roles={[', routeIndex);
  if(rolesStart < 0 || rolesStart > routeEnd) return source;
  const rolesEnd = source.indexOf(']}', rolesStart);
  if(rolesEnd < 0 || rolesEnd > routeEnd) throw new Error(`Tim Komutanı erişim yaması: roles kapanışı bulunamadı (${routePath})`);
  const roleBlock = source.slice(rolesStart, rolesEnd);
  if(roleBlock.includes(`'${role}'`) || roleBlock.includes(`"${role}"`)) return source;
  return source.slice(0, rolesEnd) + `,'${role}'` + source.slice(rolesEnd);
}

function ensureRoleOnNavItem(source, navPath, role){
  const itemIndex = source.indexOf(`to: '${navPath}'`);
  if(itemIndex < 0) throw new Error(`Tim Komutanı erişim yaması: menü öğesi bulunamadı (${navPath})`);
  const lineEnd = source.indexOf('\n', itemIndex);
  const rolesStart = source.indexOf('roles: [', itemIndex);
  if(rolesStart < 0 || (lineEnd >= 0 && rolesStart > lineEnd)) return source;
  const rolesEnd = source.indexOf(']', rolesStart);
  if(rolesEnd < 0 || (lineEnd >= 0 && rolesEnd > lineEnd)) throw new Error(`Tim Komutanı erişim yaması: menü roles kapanışı bulunamadı (${navPath})`);
  const roleBlock = source.slice(rolesStart, rolesEnd);
  if(roleBlock.includes(`'${role}'`) || roleBlock.includes(`"${role}"`)) return source;
  return source.slice(0, rolesEnd) + `,'${role}'` + source.slice(rolesEnd);
}

let app = read('src/app/App.tsx');
app = ensureRoleOnRoute(app, '/izin-onaylari', 'team_commander');
app = ensureRoleOnRoute(app, '/yoklama', 'team_commander');
write('src/app/App.tsx', app);

let layout = read('src/components/Layout.tsx');
layout = ensureRoleOnNavItem(layout, '/izin-onaylari', 'team_commander');
layout = ensureRoleOnNavItem(layout, '/yoklama', 'team_commander');
layout = layout.replace(
  `{ to: '/izin-onaylari', icon: 'calendarDays', label: 'Onay Bekleyen İzinler', roles: ['admin','commander','team_commander'] },`,
  `{ to: '/izin-onaylari', icon: 'calendarDays', label: 'İzin Talepleri', roles: ['admin','commander','team_commander'] },`
);
write('src/components/Layout.tsx', layout);

console.log('Tim Komutanı: tüm yoklama + izin talepleri salt-okunur erişimi uygulandı.');
