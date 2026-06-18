'use strict';

// Bilisim Teknolojileri Alani zümre tutanağı şablonları.
// Kaynak: Karakopru GAP MTAL 2025-2026 Sene Basi Zümre. Tablolar metne donusturuldu.
// Ogretmen panelden duzenleyebilir; uretimde yil/tarih/no formdan gelir.

const ATTENDEES = [
  'Gülsüm ÇELİK - Bilişim Teknolojileri Alan Şefi',
  'Adil ALTUN - Bilişim Teknolojileri Alanı Laboratuvar Şefi',
  'Mehmet Erhan MERMER - Bilişim Teknolojileri Alanı Laboratuvar Şefi',
  'Ayhan AKKAYA - Bilişim Teknolojileri Alanı Laboratuvar Şefi',
  'İrfan BAYAT - Bilişim Teknolojileri Alanı Laboratuvar Şefi',
  'M.Fatih TAŞ - Bilişim Teknolojileri Alanı Öğretmeni'
];

const SIGNERS = [
  { name: 'Gülsüm ÇELİK', role: 'Bilişim Teknolojileri Alan Şefi' },
  { name: 'İrfan BAYAT', role: 'Bilişim Teknolojileri Alanı Lab. Şefi' },
  { name: 'Adil ALTUN', role: 'Bilişim Teknolojileri Alanı Lab. Şefi' },
  { name: 'Mehmet Erhan MERMER', role: 'Bilişim Teknolojileri Alanı Lab. Şefi' },
  { name: 'Ayhan AKKAYA', role: 'Bilişim Teknolojileri Alanı Lab. Şefi' },
  { name: 'M.Fatih TAŞ', role: 'Bilişim Teknolojileri Alanı Öğretmeni' }
];

const seneBasi = {
  name: 'Sene Başı Zümre Toplantısı',
  meetingTitle: 'SENE BAŞI ZÜMRE TOPLANTISI',
  area: 'Bilişim Teknolojileri Alanı',
  attendees: ATTENDEES,
  signers: SIGNERS,
  principalName: 'Hikmet ŞAHİN',
  principalTitle: 'Okul Müdür V.',
  agenda: [
    'Açılış ve yoklama,',
    'Bir önceki toplantıda alınan kararlar,',
    'Planlamaların; eğitim öğretim ile ilgili mevzuat, okulun kuruluş amacı ve ilgili alanın öğretim programına uygun yapılması,',
    'Atatürkçülükle ilgili konuların üzerinde durularak çalışmaların buna göre planlanması ile öğretim programlarının incelenmesi, programların çevre özellikleri de dikkate alınarak amacına ve içeriğine uygun olarak uygulanması, yıllık plan ve ders planlarının hazırlanması,',
    'Derslerin işlenişinde uygulanacak öğretim yöntem ve tekniklerin belirlenmesi,',
    'Özel eğitim ihtiyacı olan öğrenciler için bireyselleştirilmiş eğitim programı (BEP) ile ders planlarının görüşülmesi,',
    'Bilişim Teknolojileri Alanı Çerçeve Öğretim Programının incelenmesi,',
    'Okutulacak derslerin belirlenmesi ve modül süreleri dikkate alınarak haftalık ders saatlerinin belirlenmesi ve uygulanacak yıllık planların yapılması,',
    'Bilişim Teknolojileri alanında öğrenim gören öğrencilerin bölüm atölyelerinde kıyafetlerinin belirlenmesi,',
    'Diğer zümre ve alan öğretmenleriyle yapılacak iş birliği ve esasların belirlenmesi,',
    'Öğretim alanı ile bilim ve teknolojideki gelişmelerin izlenerek uygulamalara yansıtılması,',
    'Öğrencilere girişimcilik bilincinin kazandırılmasına yönelik çalışmaların yapılması,',
    'Derslerin daha verimli işlenebilmesi için ihtiyaç duyulan kitap, araç-gereç vb. öğretim materyallerinin belirlenmesi,',
    'Okul ve çevre imkânlarının değerlendirilerek yapılacak deney, proje, gezi ve gözlem etkinliklerinin planlanması,',
    'Sınavların, beceri sınavlarının ve ortak sınavların planlanması,',
    'Proje konuları ile performans çalışmalarının belirlenmesi, planlanması ve ölçme değerlendirmeye yönelik ölçeklerin hazırlanması,',
    'İş sağlığı ve güvenliği tedbirlerinin değerlendirilmesi,',
    'Alanımızla ilgili kısa ve orta vadeli hedeflerin belirlenmesi,',
    'Dilek ve temenniler, kapanış.'
  ],
  discussions: [
    'Zümre toplantısını yapmak üzere toplanan zümre öğretmenleri yukarıdaki "GÜNDEM" maddelerini görüşmüşler ve aşağıdaki kararları almışlardır.',
    'Bir önceki yıla ait alınan kararlar okundu. 1. ve 2. dönem zümre toplantılarında alınan kararlara uyulduğu görüldü. Millî Eğitim Bakanlığı tarafından ölçme değerlendirmede alınan kararlar doğrultusunda bilişim teknolojileri alanı dersleri için her dönem 2 yazılı yapılmasına ve her dönem için 2 performans notuyla öğrencilerin değerlendirilmesine oy birliğiyle karar verildi. 2. performans notunun öğrencinin sınıf içi durumundan verileceği karara bağlandı. Uygulama dersleri için gerektiğinde uygulama sınavları yapılabileceği söylendi.',
    'Bir önceki yıl zümre kararları okundu. Alınan kararların aynen uygulandığı, konuların yıllık planlarda planlandığı şekilde işlendiği ve müfredata uygun şekilde tamamlandığı belirtildi.',
    'Atatürk ilke ve inkılâpları ile millî benlik duygusunu artıran günlerin yıllık planlarda belirtilen gün ve zamanlarla sınırlı kalmayıp yer yer ders içerisinde konulara uygun şekilde işlenmesine, 2104 ve 2488 nolu Tebliğler Dergilerinden faydalanılmasına karar verildi. Önemli gün ve haftalarda aşağıdaki konuların işlenmesine karar verildi:\nAtatürk\'ün Millî Eğitime verdiği önem\nAtatürk\'ün bilime, sanata ve sanatçıya verdiği önem\nCumhuriyet\'in önemi\nAtatürk\'ün kişiliği\nAtatürk\'ün öğretmenlere verdiği önem\nİstiklal Marşı\'nın önemi ve Mehmet Akif Ersoy\'un hayatı\nÇanakkale Zaferi\'nin önemi\nAtatürk\'ün çocuk sevgisi\nAtatürk\'ün gençlere verdiği önem\n15 Temmuz Demokrasi Zaferi\'nin önemi',
    'Derslerin işlenişinde uygulanacak eğitim yöntem ve teknikleri belirlendi:\nKavram Haritası, Anlatım, Soru-Cevap, Tartışma, Gözlem, Gösteri, Anahtar Kavram, Uygulama.',
    'Bireysel eğitime ihtiyacı olan öğrenciler okulun açıldığı ilk hafta öğretmenler tarafından tespit edilecek, bire bir görüşmeler yapılacak ve BEP toplantısının ardından yıllık planlar hazırlanacaktır. BEP\'li öğrencilerimizin sınavları özel olarak hazırlanmakta ve bire bir eğitim verilmektedir.',
    'Kademeli değişiklikler doğrultusunda alana ait haftalık ders dağılımı incelendi: 9. sınıflarda 11 saat, 10. sınıflarda 13 saat, 11. sınıflarda 17 saat meslek dersi ve 3 saat seçmeli meslek dersi, 12. sınıflarda 7 saat seçmeli meslek dersi uygulanacaktır.',
    'Alanda okutulacak dersler ve haftalık ders saatleri aşağıda verilmiştir:\n9. SINIFLAR: Mesleki Gelişim Atölyesi (2), Bilişim Teknolojilerinin Temelleri (3), Programlama Temelleri (4), Bilgisayarlı Tasarım Uygulamaları (2)\n10. SINIFLAR: Nesne Tabanlı Programlama (10), Robotik ve Kodlama (3)\n11. SINIFLAR: Web Tabanlı Uygulama Geliştirme (8), Grafik ve Canlandırma (4), Mobil Uygulamalar (5), Yapay Zekâ ve Makine Öğrenmesi (3)\n12. SINIFLAR (Seçmeli): Açık Kaynak İşletim Sistemi (2), Web Programcılığı (3), Sosyal Medya (2)\nHer dersin amacı çerçeve öğretim programına uygun olarak incelenmiş ve yıllık planların buna göre hazırlanmasına karar verilmiştir.',
    'Alan/dal öğrencilerinin bilişim atölyelerinde beyaz önlük giymeleri kararlaştırılmıştır.',
    'Okulumuzda bulunan diğer zümreler ile bilgi alışverişinde bulunulacaktır. Diğer bölümlerin uygulama laboratuvarlarındaki arızalı bilgisayarların bakım onarımı yapılacaktır. Atatürkçülük konularında okulumuz tarih öğretmeninden yardım alınacaktır.',
    'Bilim ve teknolojideki gelişmelerin izlenmesi için teknoloji haberleri takip edilecek, bilimsel bir dergiye abone olunabilecek ve öğrencilere derslerde bilim ve teknoloji videoları izletilecektir.',
    'Öğrencilere girişimcilik bilincinin kazandırılması için görev ve sorumluluklar verilecektir. Ders işlenişinde bu konunun üzerinde durulmasına ve öğrencilerin teşvik edilmesine karar verildi.',
    'Ders modülleri kullanılacaktır. Derslerden arta kalan zamanda öğrencilere robotik ve kodlama konusunda bilgi verilip uygulamalar yaptırılacaktır.',
    'Okul ve çevre imkânlarını kullanarak teknik gezi planlaması yapılacaktır. Robotik ve kodlama konusunda öğrencilere rehberlik edilip robot yapmaları sağlanacaktır.',
    'Sınav tarihleri sene başı öğretmenler kurulunda alınan karara göre aşağıdaki gibidir:\n1. Dönem 1. Yazılı: 03/10/2025 - 07/10/2025\n1. Dönem 2. Yazılı: 12/01/2026 - 16/01/2026\n2. Dönem 1. Yazılı: 09/03/2026 - 14/03/2026\n2. Dönem 2. Yazılı: 08/06/2026 - 12/06/2026',
    'Proje Ödevi Değerlendirme Esasları (her madde 10 puan, toplam 100):\nÖdev hazırlama planı yapması ve uygulama başarısı; gerekli bilgi, doküman, araç-gereci toplaması ve kullanabilmesi; ödevi bizzat yapması ve gösterdiği çaba; ders öğretmeni ile diyalog kurması; kaynak kişiler ve grupla iş birliği; ödevin doğruluk ve kullanılabilirlik derecesi; yazım kurallarına uygunluğu; düzgün ifade ve anlaşılabilirlik; tertip, temizlik ve estetik görünüm; zamanında teslim.\nÖdevler verildikten sonra öğrenci ile devamlı irtibat hâlinde olunacak ve Nisan ayının üçüncü haftası toplanacaktır. Proje konuları öğrenci seviyelerine uygun olarak ders öğretmenleri tarafından verilecektir.',
    'İş sağlığı ve güvenliği kapsamında öğrencilere sene başında bilgilendirme yapılıp tutanak altına alınacaktır. Laboratuvar kullanım çizelgeleri asılı olup öğrencilere okunacak, iş güvenliği videoları izletilecektir. 11. sınıf öğrencilerine Mayıs ayında İş Sağlığı ve Güvenliği eğitimi verilerek sertifika düzenlenecektir.',
    'Alan olarak kısa vadeli hedefimiz öğrencilerimize alanları ile ilgili tüm bilgileri öğretmek ve meslek hayatında kullanmalarını sağlamak; orta vadeli hedefimiz ise öğrencilerimizin yükseköğretim programlarını kazanmalarını sağlamaktır.',
    'Bilişim Teknolojileri Alan Şefi, eğitim öğretim yılının başarılı geçmesi dilekleriyle toplantıyı sonlandırdı.'
  ],
  decisions: [
    'Modüller öğrencilere sene başında ücretsiz olarak dağıtılacaktır.',
    'Ders modülleri meslek.eba.gov.tr üzerinden takip edilip eksik konular araştırılarak öğrencilere anlatılacaktır.',
    'Bilişim Teknolojileri uygulama laboratuvarı eksiklikleri tamamlanıp yeni eğitim öğretim yılına hazır hâle getirilecektir.',
    'Robotik ve kodlama konusunda daha fazla eğitim verilecektir.',
    'Alan olarak bilimsel dergiler takip edilecek ve teknolojik gelişmelerden haberdar olunacaktır.',
    'Alanımızdan mezun olan kişiler okulumuza davet edilerek seminer düzenlenecektir.',
    'Derslerde başarıyı artırmak amacıyla örnek uygulamalar çoğaltılacaktır.',
    'Diğer alan zümreleri ile ortaklaşa çalışılıp okul başarısını artıracak tedbirler alınacaktır.',
    'Alan öğrencilerine teknik gezi ve üniversite gezisi yapılması planlanacaktır.'
  ]
};

module.exports = [seneBasi];
