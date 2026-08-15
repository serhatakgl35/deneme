import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const copies = [
  ['patches/ui-v2/Layout.tsx', 'src/components/Layout.tsx'],
  ['patches/ui-v2/Layout.module.css', 'src/components/Layout.module.css'],
  ['patches/ui-v3/DashboardPage.tsx', 'src/pages/DashboardPage.tsx'],
  ['patches/ui-v3/DashboardPage.module.css', 'src/pages/DashboardPage.module.css'],
];

for (const [sourceRelative, targetRelative] of copies) {
  const source = path.join(root, sourceRelative);
  const target = path.join(root, targetRelative);
  if (!fs.existsSync(source)) throw new Error(`PBYS UI v3 yaması eksik: ${sourceRelative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

const layoutPath = path.join(root, 'src/components/Layout.tsx');
let layoutSource = fs.readFileSync(layoutPath, 'utf8');
const returnMarker = '  return <div className={styles.shell}>';
const scrollResetEffect = `  useEffect(() => {\n    if ('scrollRestoration' in window.history) {\n      window.history.scrollRestoration = 'manual';\n    }\n    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });\n    resetScroll();\n    const frame = window.requestAnimationFrame(resetScroll);\n    const timer = window.setTimeout(resetScroll, 80);\n    return () => {\n      window.cancelAnimationFrame(frame);\n      window.clearTimeout(timer);\n    };\n  }, [location.pathname, location.search]);\n\n`;

if (!layoutSource.includes("window.history.scrollRestoration = 'manual'")) {
  if (!layoutSource.includes(returnMarker)) throw new Error('Layout.tsx dönüş işareti bulunamadı.');
  layoutSource = layoutSource.replace(returnMarker, `${scrollResetEffect}${returnMarker}`);
  fs.writeFileSync(layoutPath, layoutSource, 'utf8');
}

console.log(`PBYS birleşik ana sayfa v3 uygulandı: ${copies.length} dosya. Mobil açılışta scroll sıfırlama aktif.`);
