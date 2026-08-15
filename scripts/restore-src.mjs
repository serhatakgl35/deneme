import fs from 'node:fs';
import path from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

const root = process.cwd();
const bundleDir = path.join(root, 'build-src');
const partNames = fs.readdirSync(bundleDir)
  .filter((name) => /^src_br\.part\d+\.txt$/.test(name))
  .sort();

if (partNames.length !== 9) {
  throw new Error(`PBYS source bundle eksik: ${partNames.length}/9 parça bulundu.`);
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
