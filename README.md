# Video İndirici — sunucu kurulumu

Bu proje GitHub Pages arayüzü + Node.js API kullanır. API yalnızca izin verilen doğrudan video dosyalarını sunar; YouTube/TikTok sayfa çözümleme veya koruma aşma yapmaz.

## 1. Sunucuyu Render'da yayınla
1. https://render.com adresine GitHub ile giriş yap.
2. **New + → Web Service** seç.
3. `m09126664-cell/video-downloader` deposunu bağla.
4. **Runtime: Node**, **Build Command: npm install**, **Start Command: npm start** seç.
5. Ücretsiz plan varsa seçip **Deploy Web Service** tıkla.
6. Yayın bitince verilen `https://....onrender.com` adresini kopyala.

## 2. Sitede sunucu adresini kaydet
1. https://m09126664-cell.github.io/video-downloader/ adresini aç.
2. “Sunucu adresi” kutusuna Render adresini yapıştır.
3. Video bağlantısını girip **İndir** tıkla.

## Sınırlar
- Yalnızca doğrudan video dosyası URL'leri ve indirme iznin olan dosyalar.
- Maksimum dosya boyutu 500 MB.
- Yalnızca genel internet IP adresleri; yerel/özel ağ adresleri engellenir.
- En fazla 3 yönlendirme ve 10 istek/dakika.
- Bazı barındırma servislerinin ücretsiz örnekleri boşta kalınca uykuya geçebilir.
- GitHub Pages tek başına sunucu çalıştıramaz; Render servisi ayrıca yayınlanmalıdır.
