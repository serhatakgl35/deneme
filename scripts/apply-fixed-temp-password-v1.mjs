import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function patchFile(rel) {
  const file = path.join(root, rel);
  let source = fs.readFileSync(file, 'utf8');

  const oldGenerator = `function makeTemporaryPassword() {\n  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';\n  const bytes = new Uint32Array(14);\n  crypto.getRandomValues(bytes);\n  return Array.from(bytes, value => alphabet[value % alphabet.length]).join('');\n}`;
  const newGenerator = `function makeTemporaryPassword() {\n  return '123456';\n}`;
  if (!source.includes(oldGenerator) && !source.includes(newGenerator)) {
    throw new Error(`${rel}: geçici şifre üreticisi bulunamadı.`);
  }
  source = source.replace(oldGenerator, newGenerator);

  source = source.replace(
    /mevcut şifre geçersiz kılınıp yeni bir geçici şifre oluşturulsun mu\?/g,
    'mevcut şifre geçersiz kılınıp geçici şifre 123456 olarak ayarlansın mı? Kullanıcı ilk girişte kendi şifresini belirlemek zorunda kalacak.'
  );

  source = source.replace(
    /window\.prompt\(`\$\{row\.fullName\} için geçici şifre oluşturuldu\. Bu pencere kapatılınca şifre tekrar gösterilmez; kopyalayın:`, temporaryPassword\);/g,
    "window.alert(`${row.fullName} için geçici şifre 123456 olarak ayarlandı. Kullanıcı ilk girişte kendi şifresini belirlemek zorunda.`);"
  );
  source = source.replace(
    /window\.prompt\(`\$\{person\.fullName\} için geçici şifre oluşturuldu\. Bu pencere kapatılınca tekrar gösterilmez; kopyalayın:`, temporaryPassword\);/g,
    "window.alert(`${person.fullName} için geçici şifre 123456 olarak ayarlandı. Kullanıcı ilk girişte kendi şifresini belirlemek zorunda.`);"
  );

  source = source.replace(/>Geçici Şifre Oluştur<\/button>/g, '>Şifreyi 123456 Yap</button>');

  fs.writeFileSync(file, source);
}

patchFile('src/pages/UsersPage.tsx');
patchFile('src/pages/PersonnelPage.tsx');

console.log('PBYS sabit geçici şifre 123456 kuralı uygulandı.');
