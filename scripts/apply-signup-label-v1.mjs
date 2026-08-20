import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });
}

let changed = 0;

for (const file of walk(srcDir)) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  after = after.replace(/>\s*İlk Giriş Yap\s*</g, '>Üye Ol<');
  after = after.replace(/>\s*İlk Giriş\s*</g, '>Üye Ol<');
  after = after.replace(/>\s*İlk giriş\s*</g, '>Üye Ol<');

  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed += 1;
  }
}

if (changed === 0) {
  throw new Error('Üyelik sekmesindeki “İlk Giriş” etiketi bulunamadı.');
}

console.log(`PBYS üyelik sekmesi “Üye Ol” olarak güncellendi (${changed} dosya).`);
