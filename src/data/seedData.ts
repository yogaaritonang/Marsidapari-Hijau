import { Community, Devotion, Challenge, MapMarkerLocation, GreenEvent, ThreadPost, EcotheologyArticle } from '../types';

export const SEED_COMMUNITIES: Community[] = [
];

export const SEED_DEVOTIONS: Devotion[] = [
  {
    id: 'dev-1',
    title: 'Bumi Ini Milik Tuhan, Bukan Milik Keserakahan Kita',
    scripture: 'Mazmur 24:1',
    verseText: 'Tuhanlah yang empunya bumi serta segala isinya, dan dunia serta yang diam di dalamnya.',
    content: 'Seringkali manusia memperlakukan bumi seolah-olah kita adalah pemilik mutlak yang bebas merusaknya. Namun sang pemazmur menegaskan kebenaran mendasar: seluruh ciptaan, dari air Danau Toba yang hening hingga hutan di perbukitan Tapanuli Utara, adalah hak milik Allah. Ketika kita membuang sampah sembarangan atau mencemari sungai, kita sedang merusak pekarangan Sang Pencipta. Hari ini, mari pandang setiap jengkal tanah sebagai tempat kudus di mana Allah berkarya.',
    callToAction: 'Bawa tas belanja kain atau tumbler saat keluar rumah hari ini, sebagai tanda hormat kita kepada pemilik bumi.',
    batakWisdom: 'Jolo nidilat bibir asa nidok hata, jolo dipingkir ulaon asa dibahen: Pikirkanlah dampak perbuatan kita terhadap alam sebelum bertindak.',
    readingTime: 1,
    linkedChallengeId: 'chal-tumbler',
    date: '2026-10-27',
  },
  {
    id: 'dev-2',
    title: 'Melihat Alam Melalui Mata Allah: Sungguh Amat Baik',
    scripture: 'Kejadian 1:31',
    verseText: 'Maka Allah melihat segala yang dijadikan-Nya itu, sungguh amat baik. Jadilah petang dan jadilah pagi, itulah hari keenam.',
    content: 'Sebelum manusia diciptakan, Allah telah memandang ciptaan-Nya dan menyatakannya "amat baik". Keanekaragaman hayati, gemercik air pegunungan Dolok Martimbang, dan kesuburan lembah Silindung memiliki nilai intrinsik di hadapan Tuhan, bukan sekadar komoditas ekonomi. Ketika kita menjaga kebersihan lingkungan, kita sedang mempertahankan keindahan karya seni Allah yang telah Ia nyatakan baik sejak awal mula.',
    callToAction: 'Pilah sampah organik sisa makanan hari ini dan jangan campur dengan plastik.',
    batakWisdom: 'Marsiadapari mamparbuehon denggan: Gotong royong yang tulus selalu membuahkan kebaikan bagi ciptaan.',
    readingTime: 1,
    linkedChallengeId: 'chal-pilah-sampah',
    date: '2026-10-26',
  },
  {
    id: 'dev-3',
    title: 'Tugas Asali: Mengusahakan dan Memelihara',
    scripture: 'Kejadian 2:15',
    verseText: 'Tuhan Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.',
    content: 'Dua kata kunci dalam mandat Eden adalah "abad" (melayani/mengusahakan) dan "shamar" (menjaga/melindungi). Mengusahakan alam tidak pernah boleh dipisahkan dari melindunginya. Sebagai jemaat dan civitas IAKN Tarutung, kita dipanggil bukan sebagai penakluk alam liar, melainkan sebagai pekebun Allah yang penuh kasih. Tanggung jawab ini adalah ibadah harian kita di dunia nyata.',
    callToAction: 'Siram atau rawat tanaman di pekarangan rumah, asrama, atau kampus IAKN hari ini.',
    batakWisdom: 'Sisolisoli tubu ni sihala, molo denggan roham tu tano, tano pe denggan rohana tu ho.',
    readingTime: 1,
    linkedChallengeId: 'chal-tanam-pohon',
    date: '2026-10-25',
  },
  {
    id: 'dev-4',
    title: 'Mata Air yang Mengalir di Lembah Silindung',
    scripture: 'Mazmur 104:10-14',
    verseText: 'Engkau yang melepas mata-mata air ke dalam lembah-lembah, mengalir di antara gunung-gunung, memberi minum segala binatang di padang...',
    content: 'Mazmur 104 adalah himne kosmik terindah tentang keterikatan seluruh ciptaan dengan pemeliharaan Allah yang setia. Sumber mata air hangat di Sipoholon dan aliran Sungai Sigeaon memberi kehidupan bagi persawahan dan masyarakat Tarutung. Ketika kita menghemat air dan mencegah racun kimia meresap ke tanah, kita menjadi saluran berkat hidup bagi generasi mendatang.',
    callToAction: 'Matikan keran saat menyabuni tangan atau sikat gigi. Hemat setidaknya 5 liter air hari ini.',
    batakWisdom: 'Aek godang tu aek laut, dos ni roha sibaen na saut: Kesatuan hati warga menghasilkan keselamatan bersama.',
    readingTime: 1,
    linkedChallengeId: 'chal-hemat-air',
    date: '2026-10-24',
  },
  {
    id: 'dev-5',
    title: 'Jeritan Semesta dan Pengharapan Anak-Anak Allah',
    scripture: 'Roma 8:19-22',
    verseText: 'Sebab dengan sangat rindu seluruh makhluk menantikan saat anak-anak Allah dinyatakan... kita tahu, bahwa sampai sekarang segala makhluk sama-sama mengeluh dan sama-sama merasa sakit bersalin.',
    content: 'Rasul Paulus melukiskan alam yang merintih akibat dosa eksploitasi manusia. Danau Toba yang terancam eceng gondok dan sampah, serta hutan yang gundul, adalah rintihan nyata bumi kita. Namun semesta menaruh harap pada "anak-anak Allah" yang telah ditebus Kristus: yaitu kita yang bangkit memulihkan luka-luka alam dengan belas kasih dan tindakan gotong royong.',
    callToAction: 'Matikan lampu dan cabut charger peralatan listrik yang tidak terpakai untuk mengurangi jejak karbon.',
    batakWisdom: 'Si pogos so marripu, si mamora so marhaha maranggi: Bergotong royong tanpa memandang status demi tanah kelahiran.',
    readingTime: 1,
    linkedChallengeId: 'chal-hemat-listrik',
    date: '2026-10-23',
  },
];

export const SEED_CHALLENGES: Challenge[] = [
  {
    id: 'chal-tumbler',
    title: 'Bawa Tumbler & Tolak Botol Sekali Pakai',
    category: 'harian',
    difficulty: 'Mudah',
    points: 15,
    iconName: 'CupWater',
    description: 'Gunakan botol minum isi ulang saat kuliah di IAKN atau beraktivitas harian di Tarutung.',
    instruction: 'Ambil foto botol tumbler Anda yang sedang Anda gunakan saat beraktivitas hari ini.',
    estimatedImpact: {
      wasteKg: 0.1,
    },
    featured: true,
  },
  {
    id: 'chal-tanpa-plastik',
    title: 'Belanja Tanpa Kantong Plastik',
    category: 'harian',
    difficulty: 'Mudah',
    points: 20,
    iconName: 'ShoppingBag',
    description: 'Bawa tas kain sendiri saat berbelanja di Pasar Tarutung, Onan, atau minimarket.',
    instruction: 'Fotokan tas belanja kain atau keranjang belanjaan Anda tanpa kantong kresek sekali pakai.',
    estimatedImpact: {
      wasteKg: 0.15,
    },
    featured: true,
  },
  {
    id: 'chal-pilah-sampah',
    title: 'Pilah Sampah Organik & Anorganik',
    category: 'harian',
    difficulty: 'Mudah',
    points: 25,
    iconName: 'Trash2',
    description: 'Pisahkan sisa makanan/organik dari sampah kering di rumah atau kos mahasiswa.',
    instruction: 'Fotokan dua wadah pemilahan sampah organik dan anorganik yang rapi di tempat Anda.',
    estimatedImpact: {
      wasteKg: 0.5,
    },
    featured: true,
  },
  {
    id: 'chal-hemat-listrik',
    title: 'Padamkan Lampu & Alat Elektronik Standby',
    category: 'harian',
    difficulty: 'Mudah',
    points: 15,
    iconName: 'Zap',
    description: 'Matikan lampu ruangan yang cukup cahaya alami dan cabut colokan kabel yang menganggur.',
    instruction: 'Fotokan ruangan terang alami dengan saklar lampu mati atau colokan yang tercabut rapi.',
    estimatedImpact: {
      electricityKwh: 1.2,
    },
  },
  {
    id: 'chal-hemat-air',
    title: 'Bijak Air Bersih Silindung',
    category: 'harian',
    difficulty: 'Mudah',
    points: 20,
    iconName: 'Droplets',
    description: 'Gunakan air secukupnya saat mencuci pakaian, mandi, dan tampung air bilasan untuk siram tanaman.',
    instruction: 'Fotokan pemanfaatan air yang efisien atau ember penampung air bilasan.',
    estimatedImpact: {
      waterLiters: 25,
    },
  },
  {
    id: 'chal-tanam-pohon',
    title: 'Tanam Satu Pohon / Tunas Harapan',
    category: 'mingguan',
    difficulty: 'Sedang',
    points: 60,
    iconName: 'Sprout',
    description: 'Tanam bibit pohon buah, kopi, pinus, atau tanaman peneduh di pekarangan atau bukit sekitar.',
    instruction: 'Unggah foto Anda sedang menanam bibit atau tunas muda yang telah tertanam di tanah basah.',
    estimatedImpact: {
      trees: 1,
    },
    featured: true,
  },
  {
    id: 'chal-kompos',
    title: 'Olah Sisa Makanan Menjadi Kompos',
    category: 'mingguan',
    difficulty: 'Sedang',
    points: 45,
    iconName: 'Flower2',
    description: 'Kumpulkan daun kering, kulit buah, dan sisa sayuran ke lubang biopori atau wadah kompos.',
    instruction: 'Fotokan wadah komposter atau tumpukan kompos organik yang sedang Anda olah.',
    estimatedImpact: {
      wasteKg: 2.0,
    },
  },
  {
    id: 'chal-bersih-danau',
    title: 'Marsiadapari Bersih Sungai & Danau Toba',
    category: 'danau_toba',
    difficulty: 'Tantangan Khusus',
    points: 80,
    iconName: 'Waves',
    description: 'Pungut sampah plastik di sepanjang tepian Sungai Sigeaon atau pantai Danau Toba (Muara/Balige).',
    instruction: 'Fotokan karung berisi sampah plastik yang berhasil dikumpulkan dari area perairan.',
    estimatedImpact: {
      wasteKg: 5.0,
      waterLiters: 100,
    },
    featured: true,
  },
  {
    id: 'chal-jalan-kaki',
    title: 'Jalan Kaki atau Naik Angkot ke Kampus',
    category: 'mingguan',
    difficulty: 'Mudah',
    points: 25,
    iconName: 'Footprints',
    description: 'Ganti kendaraan pribadi dengan jalan kaki santai atau angkutan umum di sekitar Tarutung.',
    instruction: 'Fotokan rute jalan kaki Anda atau saat sedang naik angkot menuju kampus/gereja.',
    estimatedImpact: {
      electricityKwh: 0.8,
    },
  },
  {
    id: 'chal-komunitas-iakn',
    title: 'Gotong Royong Kampus Asri IAKN Tarutung',
    category: 'komunitas',
    difficulty: 'Tantangan Khusus',
    points: 70,
    iconName: 'Users',
    description: 'Aksi bersama teman sekelas atau kelompok pemuda gereja membersihkan fasilitas publik bersama.',
    instruction: 'Fotokan kelompok kerja bakti bersama sampah yang berhasil dikumpulkan.',
    estimatedImpact: {
      wasteKg: 8.0,
      trees: 2,
    },
  },
];

export const SEED_LOCATIONS: MapMarkerLocation[] = [];

export const SEED_EVENTS: GreenEvent[] = [];

export const SEED_THREADS: ThreadPost[] = [
  {
    id: 'th-seed-1',
    userId: 'u-naomi',
    userName: 'Naomi Siregar',
    communityName: 'IAKN Tarutung',
    category: 'ide',
    caption: '💡 Ide untuk teman-teman kampus & pemuda gereja: Bagaimana kalau setiap persekutuan doa dan ibadah Minggu kita terapkan "Gerakan Bawa Tumbler & Wadah Sendiri"? Selain mengurangi sampah botol plastik sekali pakai di kawasan Tarutung, ini bentuk nyata kita mengasihi ciptaan Tuhan (Kejadian 2:15)! Setuju gak kawan-kawan? 🙏🌱',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    likes: 12,
    likedBy: ['u-daniel', 'u-johannes', 'u-ruth', 'u-samuel', 'u-elizabeth', 'u-marta', 'u-togar', 'u-poltak', 'u-bintang', 'u-ester', 'u-gracia', 'u-debora'],
    status: 'aktif',
    replies: [
      {
        id: 'rep-1',
        userId: 'u-daniel',
        userName: 'Daniel Sitompul',
        communityName: 'HKBP Pearaja',
        content: 'Sangat setuju Kak Naomi! Nanti kami di seksi pemuda HKBP Pearaja siap bikin imbauan serupa.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  },
  {
    id: 'th-seed-2',
    userId: 'u-johannes',
    userName: 'Johannes Hutabarat',
    communityName: 'Pemuda Silindung',
    category: 'keluhan',
    caption: '📢 Keluhan Lingkungan: Pagi ini jalan pagi di bantaran Sungai Sigeaon dekat jembatan, sedih sekali melihat tumpukan kantong kresek dan kemasan sachet tersangkut di bebatuan air sungai. Jika dibiarkan bisa mengalir ke Danau Toba.\n\nMari kita agendakan Sabtu Bersih Marsiadapari minggu ini, siapa yang bersedia ikut?',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    likes: 18,
    likedBy: ['u-naomi', 'u-daniel', 'u-ruth', 'u-admin', 'u-samuel', 'u-elizabeth', 'u-marta', 'u-togar', 'u-poltak', 'u-bintang', 'u-ester', 'u-gracia', 'u-debora', 'u-hendra', 'u-diana', 'u-sari', 'u-mona', 'u-riki'],
    status: 'ditindaklanjuti',
    replies: [
      {
        id: 'rep-2',
        userId: 'u-admin',
        userName: 'Admin Marsiadapari',
        userRole: 'admin',
        content: 'Laporan dicatat! Lokasi ini akan dimasukkan ke agenda Marsiadapari pekanan dan dikoordinasikan dengan relawan setempat. Mauliate atas kepeduliannya!',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ],
  },
  {
    id: 'th-seed-3',
    userId: 'u-ruth',
    userName: 'Ruth Simanjuntak',
    communityName: 'IAKN Tarutung',
    category: 'aksi',
    caption: '📸 Puji Tuhan! Bibit pohon alpukat dan mangga yang ditanam di pekarangan asrama bulan lalu sekarang sudah mulai bertunas daun baru yang hijau segar! Merawat sebutir bibit mengingatkan kita akan kesetiaan Allah memelihara semesta. 🌿✨',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    likes: 24,
    likedBy: ['u-naomi', 'u-daniel', 'u-johannes', 'u-admin', 'u-samuel', 'u-elizabeth', 'u-marta', 'u-togar', 'u-poltak', 'u-bintang', 'u-ester', 'u-gracia', 'u-debora', 'u-hendra', 'u-diana', 'u-sari', 'u-mona', 'u-riki', 'u-anton', 'u-tiur', 'u-frans', 'u-elsa', 'u-yohana', 'u-marbun'],
    status: 'selesai',
    replies: [],
  },
];

export const SEED_ECOTHEOLOGY: EcotheologyArticle[] = [
  {
    id: 'eco-1',
    title: 'Mandatum Creationis di Tanah Batak: Panggilan Mengusahakan dan Memelihara',
    category: 'mandatum_creationis',
    summary: 'Memahami panggilan Kejadian 2:15 dalam terang iman Kristen: manusia ditempatkan bukan untuk mengeksploitasi, melainkan sebagai hamba dan pelindung taman kehidupan ciptaan Allah.',
    content: `Dalam Kejadian 2:15 tertulis: "TUHAN Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu." Kata Ibrani 'Abad' (mengusahakan/melayani) dan 'Shamar' (menjaga/melindungi) adalah inti dari apa yang disebut para teolog sebagai Mandatum Creationis (Mandat Penciptaan).

Bagi masyarakat Batak yang hidup di sekitar lembah Silindung dan perairan Danau Toba, tanah dan air bukanlah sekadar komoditas ekonomi. Alam adalah panggung kemuliaan Allah di mana berkat dan kelangsungan generasi dilimpahkan. Ketika kita merusak hutan, menebang pohon secara serampangan, atau membuang sampah ke sungai-sungai yang bermuara ke Danau Toba, kita sedang mencederai mandat asali yang dipercayakan Sang Khalik kepada kita.

Panggilan kita hari ini adalah menghidupkan kembali etika penatalayanan (stewardship). Setiap pohon yang kita tanam, setiap botol plastik yang kita tolak, dan setiap gotong royong pembersihan lingkungan adalah wujud ibadah nyata yang berkenan di hadapan Allah.`,
    scriptureRef: 'Kejadian 2:15',
    scriptureText: 'TUHAN Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.',
    batakWisdom: 'Sisolisoli tubu ni sihala, molo denggan roham tu tano, tano pe denggan rohana tu ho: Kebaikan kita kepada tanah akan membuahkan kelimpahan bagi hidup kita.',
    author: 'Civitas Akademika IAKN Tarutung',
    publishedAt: '2026-10-25',
    actionCall: 'Tanam satu pohon buah atau tanaman pelindung di halaman gereja atau rumah Anda pekan ini.',
    isFeatured: true,
  },
  {
    id: 'eco-2',
    title: 'Marsiadapari: Falsafah Gotong Royong Leluhur untuk Keselamatan Danau Toba',
    category: 'kearifan_lokal',
    summary: 'Bagaimana kearifan lokal Batak Toba "Marsiadapari" (gotong royong tanpa pamrih) bertransformasi menjadi kekuatan ekoteologis untuk menyelamatkan ekosistem Danau Toba.',
    content: `Falsafah Marsiadapari berakar mendalam dalam sejarah suku Batak. Pada masa bercocok tanam tradisional di bona pasogit, warga bergotong royong secara bergantian mengolah sawah, menanam padi, dan menuai panen tanpa mengharapkan upah materiil, melainkan dengan ikatan persaudaraan dan rasa tanggung jawab bersama (Siadapari).

Ketika diperhadapkan pada krisis ekologis abad ke-21—pencemaran air Danau Toba, masalah sampah plastik, dan erosi perbukitan—semangat Marsiadapari menemukan panggilan barunya: "Marsiadapari Hijau".

Kearifan lokal ini berdialog harmonis dengan panggilan kasih Kristen (Galatia 6:2: "Bertolong-tolonganlah menanggung bebanmu!"). Menyelamatkan Danau Toba tidak dapat dilakukan sendirian oleh pemerintah atau satu institusi. Diperlukan gerakan bersama seluruh jemaat, mahasiswa, pemuda, dan tetangga untuk saling menopang membersihkan lingkungan dan memulihkan bumi ciptaan.`,
    scriptureRef: 'Galatia 6:2',
    scriptureText: 'Bertolong-tolonganlah menanggung bebanmu! Demikianlah kamu memenuhi hukum Kristus.',
    batakWisdom: 'Tampakna do rantosna, rim ni tahi do gogona: Kebersamaan adalah kekuatan, kesatuan tekad membuahkan keberhasilan.',
    author: 'Pdt. Dr. Robinson Simatupang & Tim Ekoteologi',
    publishedAt: '2026-10-26',
    actionCall: 'Ajak minimal 3 sahabat atau anggota keluarga untuk aksi kerja bakti pembersihan saluran air lingkungan.',
    isFeatured: true,
  },
  {
    id: 'eco-3',
    title: 'Ekoteologi Salib: Rekonsiliasi Kristus dengan Segala Sesuatu di Bumi',
    category: 'keberlanjutan_alam',
    summary: 'Karya keselamatan Kristus tidak hanya terbatas pada jiwa manusia, tetapi merangkul pemulihan seluruh semesta ciptaan (Kosmos).',
    content: `Rasul Paulus dalam surat Kolose 1:19-20 menuliskan kabar sukacita kosmik: "Karena seluruh kepenuhan Allah berkenan diam di dalam Dia, dan oleh Dialah Ia memperdamaikan segala sesuatu dengan diri-Nya, baik yang ada di bumi, maupun yang ada di sorga, sesudah Ia mengadakan pendamaian oleh darah salib Kristus."

Teologi Kristen yang utuh tidak memisahkan penyelamatan manusia dari kepedulian terhadap ciptaan. Di kayu salib, Kristus mendamaikan hubungan yang retak: manusia dengan Allah, manusia dengan sesama, dan manusia dengan alam semesta.

Sebagai orang-orang yang telah ditebus oleh anugerah, gaya hidup kita seharusnya memancarkan pendamaian itu, bukan eksploitasi yang merusak. Memilah sampah, menghemat pemakaian energi listrik, mengurangi jejak karbon, dan melindungi satwa endemik Danau Toba adalah ekspresi iman dari orang-orang yang menghidupi keselamatan sejati.`,
    scriptureRef: 'Kolose 1:19-20',
    scriptureText: 'Dan oleh Dialah Ia memperdamaikan segala sesuatu dengan diri-Nya, baik yang ada di bumi, maupun yang ada di sorga...',
    batakWisdom: 'Jolo tinallik rimbang asa tinallik torop, jolo nidilat bibir asa nidok hata: Renungkanlah keselamatan ciptaan sebelum bertindak sembarangan.',
    author: 'Lembaga Pengabdian Masyarakat IAKN',
    publishedAt: '2026-10-27',
    actionCall: 'Lakukan evaluasi jejak sampah rumah tangga Anda dan ganti kantong plastik sekali pakai dengan tas belanja ramah lingkungan.',
    isFeatured: true,
  },
  {
    id: 'eco-4',
    title: 'Menjaga Mata Air Silindung: Teologi Air Bersih dan Keberlanjutan Ekosistem',
    category: 'danau_toba',
    summary: 'Air sebagai anugerah kehidupan ilahi dalam Mazmur 104 dan kewajiban moral jemaat menjaga kejernihan sungai Sigeaon serta hulu mata air.',
    content: `Lembah Rura Silindung dan kawasan Danau Toba dikaruniai ratusan hulu mata air jernih dan sumber air panas alami seperti di Sipoholon. Air adalah simbol Roh Kudus, pembersihan dosa, dan penopang utama sawah terasering masyarakat.

Dalam Mazmur 104:10 dikatakan: "Engkau yang melepas mata-mata air ke dalam lembah-lembah, mengalir di antara gunung-gunung, memberi minum segala binatang di padang." Air adalah hak seluruh ciptaan yang diberikan Tuhan secara cuma-cuma.

Ketika limbah rumah tangga, deterjen kimia berbahaya, atau sampah anorganik dibuang langsung ke selokan dan Sungai Sigeaon, kita sedang meracuni anugerah kehidupan itu. Teologi air mengajak kita memperlakukan setiap tetes air dengan hormat: membatasi pemakaian deterjen berlebih, memelihara pohon peneduh di sekitar daerah resapan air, dan menjaga kemurnian aliran sungai.`,
    scriptureRef: 'Mazmur 104:10-11',
    scriptureText: 'Engkau yang melepas mata-mata air ke dalam lembah-lembah, mengalir di antara gunung-gunung, memberi minum segala binatang...',
    batakWisdom: 'Aek godang tu aek laut, dos ni roha sibaen na saut: Aliran air membawa berkat, persatuan hati menjaga kelestariannya.',
    author: 'Komunitas Peduli Danau Toba & Lembah Silindung',
    publishedAt: '2026-10-28',
    actionCall: 'Gunakan air secukupnya saat mencuci dan pastikan saluran air di sekitar rumah bebas dari sumbatan sampah plastik.',
    isFeatured: false,
  },
];


