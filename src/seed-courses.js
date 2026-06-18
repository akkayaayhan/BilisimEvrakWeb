'use strict';

// Bilisim Teknolojileri Alani derslerinin yillik plan icerikleri.
// Kaynak: Karakopru GAP MTAL 2025-2026 planlari. Tarihler 2026-2027 motoru ile
// otomatik hesaplanir; burada sadece icerik (kazanim/konu) sirasi tutulur.
// Yeni dersler bu diziye eklenir.

const SIGN = ['M. Fatih TAŞ', 'Gülsüm ÇELİK', 'İrfan BAYAT', 'M. Erhan MERMER', 'Ayhan AKKAYA', 'Adil ALTUN'];
const PRINCIPAL = 'Hikmet ŞAHİN';
const AREA = 'Bilişim Teknolojileri Alanı';

// Kisa yazim icin: r(saat, kazanim, [konu satirlari], not)
const r = (hours, objectives, topic, notes) => ({
  hours: String(hours),
  objectives: objectives || '',
  topic: Array.isArray(topic) ? topic.join('\n') : topic || '',
  notes: notes || ''
});

// ==================== PROGRAMLAMA TEMELLERİ (9. Sınıf) ====================
const programlamaTemelleri = {
  name: '9. Sınıf Programlama Temelleri',
  area: AREA,
  gradeLevel: '9.SINIF',
  courseName: 'Programlama Temelleri',
  weeklyHours: 4,
  defaultMethods: 'Anlatım, gösterip yaptırma, soru cevap, grup çalışması, beyin fırtınası, uygulama',
  defaultTools: 'Bilgisayar, akıllı tahta veya projeksiyon, internet bağlantısı, programlama dili, ders kitabı',
  signTeachers: SIGN,
  principalName: PRINCIPAL,
  rows: [
    r(4, 'Problem çözme sürecindeki temel kavramları açıklar.',
      ['ÖĞRENME BİRİMİ 1: PROBLEM ÇÖZME VE ALGORİTMALAR', '1. PROBLEM ÇÖZME VE ALGORİTMALAR', '1.1. Problem Çözme ve Temel Kavramlar', '1.1.1. Problem']),
    r(4, 'Problem türlerini açıklar.\nVerilen problem için uygun teknikleri kullanarak çözüm bulur.',
      ['1.1.2. Problem Çözme Süreci', 'Demokrasinin önemi', '1.2. Problem Çözmede Temel İşlemler']),
    r(4, 'Verilen problemi çözmek üzere farklı algoritmalar tasarlar.\nAlgoritmanın hatalarını giderir.',
      ['1.2.1. Aritmetiksel Operatörler', '1.2.2. Karşılaştırma Operatörleri', '1.2.3. Mantıksal Operatörler', '1.2.4. İşlem Önceliği']),
    r(4, 'Verilen problemin çözümüne uygun akış şemaları oluşturur.',
      ['1.3. Algoritmalar', '1.3.1. Sözde Kod (Pseudo-code)', '1.3.2. Problem Çözmede Algoritma Hataları', '1.4. Akış Diyagramları']),
    r(4, 'Programlama dilinin özelliklerini ve diğer programlama dillerinden farklarını açıklar.',
      ['1.4.1. Flowcart (Akış Diyagramı) Hazırlama Programının Kurulumu', '1.4.2. Doğrusal Akış Şeması Örnekleri', '1.4.3. Karar İfadeleri Kullanılarak Hazırlanan Akış Şeması Örnekleri', '1.4.4. Döngüler Kullanılarak Hazırlanan Akış Şeması Örnekleri']),
    r(4, 'Programlama dilini bilgisayarına kurar.',
      ['ÖĞRENME BİRİMİ 3: PROGRAMLAMA DİLİ TEMELLERİ', '3. PROGRAMLAMA DİLİ TEMELLERİ', '3.1. Program ve Yazılım']),
    r(4, 'Programlama dilini kullanmak için gerekli araçları kurar.',
      ['3.2. Programlama Dili', '3.3. Neden Python?', '3.4. Python ile Neler Yapılabilir?']),
    r(4, 'Programlama dilinde değişken, sabit ve operatörleri kullanır.',
      ['3.5. Python Kurulumu', '3.6. Python İçin Gerekli Araçlar', '3.6.1. Editör Kurulumu']),
    r(4, 'Programlama dilinde değişken, sabit ve operatörleri kullanır.',
      ['3.6.2. Kütüphane Kullanımı', 'ÖĞRENME BİRİMİ 4: VERİ YAPILARI', '4. VERİ YAPILARI', '4.1. Değişken ve Sabit Kavramları', '4.1.1. Değişken Tanımlama', 'Atatürk\'ün Cumhuriyetçilik İlkesi', '1.Dönem 1.Sınav', '4.2. Operatörler', '4.2.1. Aritmetiksel Operatörler', '4.2.2. Atama Operatörleri', 'Atatürk\'ün eğitime ve bilime verdiği önem']),
    r(4, 'Programlama dilinde değişken, sabit ve operatörleri kullanır.',
      ['4.2.3. Karşılaştırma Operatörleri', '4.2.4. Mantıksal Operatörler']),
    r(4, 'Programlama dilinde veri tiplerini amacına uygun kullanır.',
      ['4.2.5. Kimlik Operatörleri', '4.3. Veri Tipleri', '4.3.1. String (Metinsel) Veri Tipi']),
    r(4, 'Programlama dilinde tanımladığı veriye ait temel fonksiyonların yer aldığı programları geliştirir.',
      ['4.3.2. Numbers (Sayısal) Veri Tipleri']),
    r(4, 'Farklı veri tiplerini (listeler, sözlükler vb.) kullanarak programlar geliştirir.',
      ['4.3.3. Listeler', '4.3.4. Tuple (Demet) Veri Tipi']),
    r(4, 'Farklı veri tiplerini (listeler, sözlükler vb.) kullanarak programlar geliştirir.',
      ['4.3.5. Dictionary (Sözlük) Veri Tipi', '4.3.6. Set (Küme) Veri Tipi']),
    r(4, 'Kontrol yapılarını kullanarak programlar geliştirir.',
      ['ÖĞRENME BİRİMİ 5: KARAR VE DÖNGÜ YAPILARI', '5. KARAR VE DÖNGÜ YAPILARI', '5.1. Karar Yapıları', '5.1.1. If-Else Yapısı']),
    r(4, 'Kontrol yapılarını kullanarak programlar geliştirir.',
      ['5.1.2. If-Elif-Else Yapısı', '1.Dönem 2.Sınav']),
    r(4, 'Kontrol yapılarını kullanarak programlar geliştirir.',
      ['5.1.3. İç İçe İfadeler']),
    r(4, 'Tekrarlı yapıları kullanarak programlar geliştirir.',
      ['5.2.1. For Döngüsü']),
    r(4, 'Tekrarlı yapıları kullanarak programlar geliştirir.',
      ['5.2.1.1. Range Kullanımı', '5.2.1.2. In Kullanımı']),
    r(4, 'Tekrarlı yapıları kullanarak programlar geliştirir.',
      ['5.2.2. While Döngüsü']),
    r(4, 'Tekrarlı yapıları kullanarak programlar geliştirir.',
      ['5.2.3. Break ve Continue Deyimleri']),
    r(4, 'Program dilinde fonksiyonları kullanır.',
      ['ÖĞRENME BİRİMİ 6: FONKSİYONLAR', '6. FONKSİYONLAR', '6.1. Fonksiyon', '6.1.1. Fonksiyonların Kullanımı']),
    r(4, 'Program dilinde fonksiyonları kullanır.',
      ['6.1.2. Gömülü Fonksiyonların ve Modüllerin Kullanımı', '6.2. Fonksiyon Tanımlama']),
    r(4, 'Program dilinde fonksiyonları kullanır.',
      ['6.2.1. Fonksiyon Düzenleme', '6.2.2. Parametre Kavramı ve Fonksiyonlar ile Parametre Kullanımı', '6.2.3. Değer Döndürme ve Return İfadesi', 'Atatürk\'ün vatan ve millet sevgisi']),
    r(4, 'Program dilinde fonksiyonları kullanır.',
      ['6.3. Lambda Fonksiyonlar']),
    r(4, 'Fonksiyon türlerine göre programlar geliştirir.',
      ['6.4. Özyinelemeli Fonksiyonlar', '6.4.1. Özyinelemeli Fonksiyonların Çalışma Şekli', '2.Dönem 1.Sınav']),
    r(4, 'Fonksiyon türlerine göre programlar geliştirir.',
      ['6.5. Fonksiyonlarda Kullanılan Değişkenlerin Kapsamı', 'ÖĞRENME BİRİMİ 7: TARİH VE STRİNG (METİN) İŞLEMLERİ', '7. TARİH VE METİN İŞLEMLERİ']),
    r(4, 'Tarih nesnesi oluşturur.\nTarih bilgisini biçimlendirir.',
      ['7.1. Tarih Nesnesi', '7.1.1. String (Metin) Olarak Girilen Değerlerin Tarih Bilgisinin Biçimlendirilmesi']),
    r(4, 'Metin bilgisini biçimlendirir.',
      ['7.2. String (Metin) İşlemleri', '7.2.1. String Verileri Birleştirme', '7.2.2. String Veri İçerisindeki Bir Karaktere Erişme', '7.2.3. String Verinin Uzunluğu']),
    r(4, 'Metin bilgisini biçimlendirir.',
      ['Çocuk, insan sevgisi ve evrensellik', '7.2.4. String Veriyi Parçalama (Slice) ve Bölme (Split)', '7.2.5. String Veri İçinde Karakter Değiştirme, Karakter Ekleme ve Çıkarma', '7.2.6. String Veri İçinde Bir Karakterin Yerini veya Metnin Karakteri İçerip İçermediğini Bulma']),
    r(4, 'İstisna işlemlerini açıklar.',
      ['7.2.7. String Veri İle Büyük ve Küçük Harf Değişimi Yapma', 'ÖĞRENME BİRİMİ 8: HATA YAKALAMA İŞLEMLERİ', '8. HATA YAKALAMA İŞLEMLERİ']),
    r(4, 'Try-except bloklarını kullanır.',
      ['8.1. Hata Kavramı ve Hata Türleri', '8.1.1. Hata Nedir?', '8.1.2. Hata Türleri']),
    r(4, 'Finally bloğunu kullanır.',
      ['8.2. Hata Yakalama', '8.3. Python Hata Türleri', '8.3.1. Birden Fazla (Except) Bloğu', '8.3.2. (as) İfadesi ile Orijinal Hata Mesajı Gösterme', '8.3.3. (finally) Bloğu', '8.3.4. (raise) İfadesi', '8.3.5. (assert) İfadesi', 'Atatürkçü düşüncede yer alan temel fikirler']),
    r(4, 'Programlama dilinde dosya okuma işlemlerini yapar.',
      ['ÖĞRENME BİRİMİ 9: DOSYA İŞLEMLERİ', '9. DOSYA İŞLEMLERİ', '9.1. Çalışma Dizini Ayarları ve Klasör Oluşturma', '9.1.1. Yol (Path) Tanımlama']),
    r(4, 'Dosya oluşturma ve yazma işlemlerini yapar.',
      ['9.1.2. Yolu Bilinen Klasör veya Dosyanın Var Olup Olmadığını Kontrol Etme', '9.1.3. Klasör Oluşturma', '9.1.4. Dosyalara Erişme ve Okuma']),
    r(4, 'Dosya silme ve yedekleme işlemlerini yapar.',
      ['2.Dönem 2.Sınav', '9.2. Dosya Oluşturma ve Yazma']),
    r(4, 'Dosya silme ve yedekleme işlemlerini yapar.',
      ['9.3. Dosya Silme ve Yedekleme']),
    r(4, 'Dosya silme ve yedekleme işlemlerini yapar.',
      ['Dönem Sonu Faaliyet Haftası Etkinlikleri'])
  ]
};

module.exports = [programlamaTemelleri];
