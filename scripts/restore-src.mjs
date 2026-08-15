import fs from 'node:fs';
import path from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

const root = process.cwd();
const bundleDir = path.join(root, 'build-src');
const partNames = [
  'src_br.part01.txt',
  'src_br.part02.txt',
  'src_br.part03.txt',
  'src_br.part04.txt',
  'src_br.part05.txt',
  'src_br.part06.txt',
  'src_br.part07a.txt',
  'src_br.part07b.txt',
  'src_br.part07c.txt',
  'src_br.part07d.txt',
  'src_br.part08.txt',
  'src_br.part09.txt',
];

for (const name of partNames) {
  if (!fs.existsSync(path.join(bundleDir, name))) {
    throw new Error(`PBYS source bundle eksik: ${name}`);
  }
}

const base64 = partNames
  .map((name) => fs.readFileSync(path.join(bundleDir, name), 'utf8').trim())
  .join('');

const compressed = Buffer.from(base64, 'base64');
const json = brotliDecompressSync(compressed).toString('utf8');
const files = JSON.parse(json);

const srcDir = path.join(root, 'src');
fs.rmSync(srcDir, { recursive: true, force: true });

for (const [relativePath, content] of Object.entries(files)) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

console.log(`PBYS kaynakları hazırlandı: ${Object.keys(files).length} dosya.`);
