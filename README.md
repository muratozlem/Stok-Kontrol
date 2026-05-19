# Stok Kontrol

Expo tabanlı React Native stok yönetim uygulaması.

## Özellikler
- Ürün ve depo yönetimi
- Stok giriş/çıkış işlemleri
- Barkod tarama
- Kritik stok seviyesi mail uyarısı (Resend)
- Kullanıcı yönetimi (admin onayı)
- PDF rapor oluşturma

## Teknolojiler
- **Frontend**: Expo / React Native
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Mail**: Resend API
- **Paket yöneticisi**: Bun

## Kurulum

```bash
cd expo
bun install
bunx expo start
```

## Ortam Değişkenleri

`expo/.env.local` dosyasına ekleyin:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_RESEND_API_KEY=re_...
```

## Veritabanı

`supabase/apply_schema.sql` dosyasını Supabase SQL Editor'de çalıştırın.
