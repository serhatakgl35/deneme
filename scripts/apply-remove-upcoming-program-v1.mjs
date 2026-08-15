import fs from 'node:fs';
import path from 'node:path';

const dashboardPath = path.join(process.cwd(), 'src/pages/DashboardPage.tsx');
let source = fs.readFileSync(dashboardPath, 'utf8');

const markers = ['YAKLAŞAN PROGRAM', '3 Günlük Faaliyet Takvimi'];
const markerIndex = markers
  .map((marker) => source.indexOf(marker))
  .find((index) => index >= 0);

if (markerIndex === undefined) {
  console.log('Yaklaşan Program bölümü zaten bulunmuyor; kaldırma adımı atlandı.');
  process.exit(0);
}

const sectionStart = source.lastIndexOf('<section', markerIndex);
if (sectionStart < 0) {
  throw new Error('Yaklaşan Program bölümünün başlangıcı bulunamadı.');
}

const tagRegex = /<section\b[^>]*>|<\/section>/g;
tagRegex.lastIndex = sectionStart;
let depth = 0;
let sectionEnd = -1;
let match;

while ((match = tagRegex.exec(source)) !== null) {
  if (match[0].startsWith('</section')) {
    depth -= 1;
    if (depth === 0) {
      sectionEnd = tagRegex.lastIndex;
      break;
    }
  } else {
    depth += 1;
  }
}

if (sectionEnd < 0) {
  throw new Error('Yaklaşan Program bölümünün sonu bulunamadı.');
}

let removeStart = sectionStart;
while (removeStart > 0 && (source[removeStart - 1] === ' ' || source[removeStart - 1] === '\t')) removeStart -= 1;
if (removeStart > 0 && source[removeStart - 1] === '\n') removeStart -= 1;

let removeEnd = sectionEnd;
while (removeEnd < source.length && (source[removeEnd] === ' ' || source[removeEnd] === '\t')) removeEnd += 1;
if (source[removeEnd] === '\n') removeEnd += 1;

source = source.slice(0, removeStart) + source.slice(removeEnd);
fs.writeFileSync(dashboardPath, source);
console.log('Ana sayfadaki Yaklaşan Program bölümü kaldırıldı.');
