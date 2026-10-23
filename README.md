# PsikoSync — Video & Alt Yazı Senkronizasyon ve Doğrulama Sistemi

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Alien036/abimin)

Psikolojik Danışma Görüşmesi için özel olarak geliştirilmiş; video/ses kaydı ile zaman damgalı alt yazı metnini eşzamanlı senkronize eden, diyalogların doğruluğunu satır satır denetlemeyi ve anında düzeltmeyi sağlayan modern web uygulaması.

---

## 🚀 Öne Çıkan Özellikler

- 🎬 **Video ve Ses Oynatıcı:** Kendi `.mp4`, `.mov`, `.mkv`, `.webm`, `.mp3` veya `.wav` kayıtlarınızı doğrudan tarayıcı üzerinden sürükleyip bırakarak yükleyebilirsiniz. Dosyalar sunucuya gönderilmez, tamamen yerel bellek üzerinden sıfır gecikmeyle çalışır.
- ⏱️ **Zaman Damgası Senkronizasyonu:** 189 diyalog satırından oluşan 43 dakikalık görüşme transkripti tam zamanında video ile birlikte akar. Herhangi bir zaman damgasına tıklandığında video tam o saniyeye atlar.
- ✍️ **Anında Metin Düzenleme (Inline Editing):** Yanlış yazılan, eksik duyulan veya düzeltilmesi gereken cümleleri çift tıklayarak veya "Metni Düzenle" butonuna basarak anında düzeltebilirsiniz. Yapılan düzeltmeler yerel belleğe (`localStorage`) kaydedilir.
- 🔍 **Orijinal Metin Karşılaştırması:** Değiştirilen satırlarda "Orijinali Göster" ve "Orijinale Dön" seçenekleriyle eski haliyle kıyaslama imkanı.
- ✅ **"Onayla & İlerle" İş Akışı:** Her satırı tek tıkla onaylayıp otomatik olarak bir sonraki cümleye geçerek hızlı ve yorulmadan kontrol yapabilirsiniz.
- 🔁 **Cümleyi Döngüye Al (Loop Mode):** Anlaşılması zor veya hızlı söylenen cümleleri siz durdurana kadar otomatik olarak başa sarıp tekrar eder.
- ⚡ **Oynatma Hızları:** 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x seçenekleriyle konuşmaları daha yavaş veya hızlı dinleme.
- 📊 **İstatistik ve İlerleme:** Onaylanan, düzeltilen ve şüpheli satırların anlık yüzdesi ve görsel ilerleme çubuğu.
- 💾 **Gelişmiş Dışa Aktarma (Export):**
  - **Markdown (.md):** Düzeltilmiş yeni transkript dosyası
  - **SubRip (.srt):** Video oynatıcılar ve YouTube için standart alt yazı formatı
  - **WebVTT (.vtt):** Web video standartları için
  - **JSON (.json):** Veri yedekleme
  - **Panoya Kopyalama:** Tek tıkla kopyalama

---

## ⌨️ Klavye Kısayolları

| Tuş | İşlev |
| --- | --- |
| **Boşluk (Space)** | Oynat / Duraklat |
| **Sol Ok (←)** | 5 Saniye Geri Sar |
| **Sağ Ok (→)** | 5 Saniye İleri Sar |
| **Yukarı Ok (↑)** | Önceki Cümleye / Segmente Atla |
| **Aşağı Ok (↓)** | Sonraki Cümleye / Segmente Atla |
| **L Tuşu** | Aktif Cümleyi Sürekli Tekrarla (Döngü Modu) |
| **Çift Tıklama** | Satır Metnini Doğrudan Düzenle |
| **Esc** | Pencereleri ve Düzenleyiciyi Kapat |

---

## 🛠️ Yerel Geliştirme (Local Setup)

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Üretim derlemesi oluşturun
npm run build
```

---

## 🌐 Vercel'de Yayınlama (Deploy on Vercel)

1. Projeyi GitHub'daki [Alien036/abimin](https://github.com/Alien036/abimin) deposuna aktarın.
2. [Vercel Dashboard](https://vercel.com/new)'a gidin.
3. `abimin` reposunu seçin ve **Deploy** butonuna basın.
4. Next.js 16 ve Turbopack ayarları otomatik olarak algılanır ve saniyeler içinde yayına girer!
