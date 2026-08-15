# PBYS 2.0 — Yeni Nesil Personel Bilgi Yönetim Sistemi

Bu proje mevcut PBYS V9'u yamalamak yerine modüler ve test edilebilir bir temel üzerinde yeniden kurmak için hazırlanmıştır.

## Alpha 2 güncel durum
Alpha 2 geliştirme dalında çekirdek işlevler Supabase'e bağlanmış, arayüz mobil-first premium tasarım sistemine geçirilmiştir. Mobilde ana operasyon listeleri (Ana Sayfa, Yoklama, Personel, Tim/Vardiya, İzin ve Aşçı listesi) tablo yerine kart görünümü kullanır; masaüstü tabloları korunur.

## Bu ilk pakette çalışan temel
- React + TypeScript modüler arayüz
- Responsive masaüstü/mobil düzen
- Ana Sayfa
- A-Z ve izole filtreli Personel Listesi
- Tim / Vardiya görünümü
- Yoklama Özeti
- İzin kayıt görünümü
- Yemek ve Rapor modülü iskeletleri
- Tek merkezi personel durum motoru
- 1/2/3 Tim: Nöbet → Nöbet İstirahati → Mesai
- Santral/Nizamiye = görev yeri, çalışma durumu değil
- Yemekhane = iki personel için 24/24 otomatik dönüşüm
- İzin ve günlük istisnaların vardiyadan öncelikli olması
- Durum motoru için otomatik testler
- Supabase/PostgreSQL çekirdek şeması + RLS başlangıç politikaları
- Eski PBYS V9 JSON yedeğini dönüştürmek için migration scripti

## Yerelde çalıştırma
1. Node.js kurulu bilgisayarda klasörü açın.
2. `npm install`
3. `npm run dev`
4. Tarayıcıdan Vite'ın verdiği yerel adresi açın.

Supabase henüz bağlanmadan uygulama örnek veriyle açılır. Bu bilinçli olarak yapılmıştır; önce arayüz ve iş kuralları test edilir.

## Supabase bağlantısı
1. Yeni Supabase projesi oluşturun.
2. SQL Editor'de sırayla:
   - `supabase/migrations/001_core_schema.sql`
   - `supabase/migrations/002_rls.sql`
3. `.env.example` dosyasını `.env` olarak kopyalayın.
4. Supabase URL ve anon key değerlerini girin.

> RLS politikaları canlıya alınmadan önce Admin, Personel, Aşçı, İdari İşler, Karakol Komutanı ve Tim Komutanı test hesaplarıyla doğrulanmalıdır.

## Eski PBYS verisi
Mevcut sistemden JSON yedek alındıktan sonra:

```bash
node scripts/convert-v9-backup.mjs eski-pbys-yedek.json pbys2-import.json
```

Bu dosya eski numeric personel kimliklerini yeni UUID kimliklerine dönüştürür ve izin/yoklama/finans kayıtlarını yeni yapıya hazırlar. Auth hesaplarının son eşleştirmesi telefon/personel üzerinden kontrollü yapılacaktır.

## Canlıya geçiş sırası
1. Personel + roller/yetkiler
2. Tim/Vardiya + Yoklama
3. İzin + izin planlama
4. Yemek/Aşçı + Tabldot
5. Borç/Ödeme + Raporlar
6. Çamaşır + faaliyet takvimi ve kalan modüller
7. Veri taşıma provası
8. Test kullanıcılarıyla kabul testi
9. Canlı alan adına geçiş

Mevcut `gencservi.com.tr` bu süreçte değiştirilmez.
