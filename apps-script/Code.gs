/**
 * =============================================================
 *  UJIAN HARIAN BIOTEKNOLOGI + ANGKET SISWA — Backend (Google Apps Script)
 * =============================================================
 *  Ujian dan angket dikerjakan terpisah, hasil keduanya tampil di satu panel guru.
 *
 *  Cara pasang (± 5 menit):
 *  1. Buat Google Sheet baru (nama bebas, mis. "Data Ujian").
 *  2. Menu Ekstensi > Apps Script.
 *  3. Hapus isi Code.gs bawaan, tempel SELURUH file ini.
 *  4. Klik "+" > HTML, beri nama persis:  Index   (tanpa .html)
 *     lalu tempel isi file Index.html.
 *  5. Ubah CONFIG di bawah (judul, durasi, PASSWORD GURU!).
 *  6. Deploy > Deployment baru > Jenis: Aplikasi web
 *       - Jalankan sebagai : Saya (akun Anda)
 *       - Yang memiliki akses : Siapa saja (Anyone)
 *     Klik Deploy, izinkan akses (Advanced > Go to ... > Allow).
 *  7. Salin URL yang berakhiran /exec
 *       Menu siswa  : https://script.google.com/macros/s/XXXX/exec
 *       Link UJIAN  : https://script.google.com/macros/s/XXXX/exec?page=tes
 *       Link ANGKET : https://script.google.com/macros/s/XXXX/exec?page=angket
 *       Link GURU   : https://script.google.com/macros/s/XXXX/exec?page=guru
 *
 *  Setiap kali kode diubah: Deploy > Kelola deployment > Edit (ikon pensil)
 *  > Versi: "Versi baru" > Deploy  (link tetap sama).
 *
 *  Data tersimpan otomatis di sheet "Peserta", "DaftarSiswa", dan "Akses".
 *  Sebelum ujian: buka panel guru > tab "Akses Kelas", isi kode & buka kelasnya.
 *  Kunci jawaban & jenis pernyataan angket hanya ada di file ini (server),
 *  tidak pernah dikirim ke HP siswa.
 * =============================================================
 */

const CONFIG = {
  MAPEL: 'Ujian Harian Biologi',          // judul di header
  MATERI: 'Bioteknologi',
  JUDUL_APP: 'Ujian & Angket Bioteknologi',
  JUDUL_TES: 'Ujian Harian Bioteknologi',
  JUDUL: 'Angket Pembelajaran Bioteknologi',

  // ---- Ujian ----
  DURASI_TES_MENIT: 60,
  BOBOT_PG: 3.2,             // per soal pilihan ganda & per soal menjodohkan (25 x 3,2 = 80)
  BOBOT_URAIAN: 4,           // per soal uraian (5 x 4 = 20)

  // ---- Angket ----
  DURASI_MENIT: 15,
  JUMLAH_POSITIF: 10,        // diambil acak dari bank pernyataan positif
  JUMLAH_NEGATIF: 10,        // diambil acak dari bank pernyataan negatif

  // ---- Umum ----
  MAKS_PELANGGARAN: 5,       // keluar aplikasi sebanyak ini -> jawaban dikirim otomatis
  PENALTI_DETIK: 15,         // layar dikunci = PENALTI_DETIK x pelanggaran ke-n
  PASSWORD_GURU: 'guru123',  // WAJIB DIGANTI
  KELAS: ['A', 'B', 'C', 'D', 'E'],
  WAJIB_TERDAFTAR: false     // true = hanya NPM yang ada di Daftar Siswa yang boleh ikut
};

// Skala angket. Positif: SS=4 ... STS=1, negatif dibalik: SS=1 ... STS=4
const OPSI = ['Sangat Setuju', 'Setuju', 'Tidak Setuju', 'Sangat Tidak Setuju'];

// Bank pernyataan angket. p:true = positif, p:false = negatif (tidak pernah dikirim ke HP siswa).
const SOAL = [
  { p: true,  t: 'Saya tertarik mencari tahu bagaimana tempe, yoghurt, atau nata de coco dibuat dengan bantuan mikroorganisme.' },
  { p: false, t: 'Bagi saya cukup mengingat contoh produk bioteknologi, tidak perlu memahami proses pembuatannya.' },
  { p: true,  t: 'Saya merasa materi bioteknologi berkaitan dengan hal-hal yang saya temui sehari-hari.' },
  { p: false, t: 'Saya lebih nyaman menunggu penjelasan guru daripada mencari tahu sendiri tentang bioteknologi.' },
  { p: false, t: 'Menurut saya, materi rekayasa genetika lebih tepat dipelajari secara mendalam saat kuliah nanti.' },
  { p: true,  t: 'Saya tetap mencoba memahami proses DNA rekombinan walaupun istilah-istilahnya cukup rumit.' },
  { p: true,  t: 'Saya senang ketika guru mengaitkan bioteknologi dengan bidang kesehatan, seperti pembuatan insulin atau vaksin.' },
  { p: false, t: 'Saat praktikum fermentasi, saya lebih banyak mengamati teman yang sedang bekerja.' },
  { p: true,  t: 'Saya pernah membaca artikel atau menonton video tentang perkembangan bioteknologi di luar jam pelajaran.' },
  { p: false, t: 'Saya biasanya mulai membuka materi bioteknologi ketika ulangan sudah dekat.' },
  { p: false, t: 'Istilah seperti plasmid atau enzim restriksi cukup saya kenali namanya saja.' },
  { p: true,  t: 'Saya bersemangat jika diberi kesempatan mencoba praktikum bioteknologi sederhana.' },
  { p: true,  t: 'Setelah belajar bioteknologi, saya membuat ringkasan atau peta konsep dengan kata-kata sendiri.' },
  { p: false, t: 'Menurut saya, perkembangan bioteknologi modern lebih banyak dirasakan di negara maju daripada di lingkungan saya.' },
  { p: false, t: 'Dalam diskusi kelompok tentang bioteknologi, saya lebih memilih mengikuti pendapat teman yang lebih paham.' },
  { p: true,  t: 'Saya bertanya kepada guru atau teman jika ada bagian materi bioteknologi yang belum saya pahami.' },
  { p: false, t: 'Selama produknya bermanfaat, menurut saya dampak bioteknologi tidak perlu dibahas terlalu jauh.' },
  { p: true,  t: 'Saya ikut menyampaikan pendapat ketika kelas membahas untung rugi tanaman transgenik.' },
  { p: false, t: 'Saya lebih memilih memakai catatan teman daripada menyusun catatan bioteknologi sendiri.' },
  { p: true,  t: 'Saya mempertimbangkan sisi etika ketika membahas kloning atau penggunaan sel punca.' },
  { p: false, t: 'Video atau bacaan tentang bioteknologi biasanya saya buka jika memang ditugaskan guru.' },
  { p: true,  t: 'Menurut saya, memahami bioteknologi dapat membantu saya memilih jurusan kuliah atau pekerjaan nanti.' },
  { p: false, t: 'Bagi saya, nilai bioteknologi yang sudah mencapai KKM sudah cukup.' },
  { p: true,  t: 'Saya mencari sumber tambahan, seperti buku atau internet, saat mengerjakan tugas bioteknologi.' }
];

// Bank soal tes. kunci = indeks jawaban benar di opsi (0 = opsi pertama).
// Menjodohkan: pasangan benar = kiri[i] dengan kanan[i]. Uraian dinilai dari kata kunci.
const SOAL_TES = [
  {"id": 1, "tipe": "pg", "t": "Bioteknologi konvensional memanfaatkan mikroorganisme untuk menghasilkan produk melalui proses fermentasi. Pasangan mikroorganisme dan produk bioteknologi konvensional yang tepat adalah...", "opsi": ["Rhizopus oligosporus - Tempe", "Lactobacillus bulgaricus - Keju keras", "Saccharomyces cerevisiae - Nata de coco", "Neurospora crassa - Kecap", "Acetobacter xylinum - Yoghurt"], "kunci": 0},
  {"id": 2, "tipe": "pg", "t": "Pada teknik DNA rekombinan, enzim yang berfungsi sebagai 'gunting biologi' untuk memotong untai DNA pada situs spesifik adalah...", "opsi": ["DNA Ligase", "Enzim Restriksi Endonuklease", "DNA Polimerase", "Helikase", "Reverse Transkriptase"], "kunci": 1},
  {"id": 3, "tipe": "pg", "t": "Vektor yang paling sering digunakan dalam rekayasa genetika bakteri untuk menyisipkan gen asing adalah...", "opsi": ["Kromosom utama bakteri", "Plasmid", "Ribosom", "Mitosom", "Kloroplas"], "kunci": 1},
  {"id": 4, "tipe": "pg", "t": "Sifat totipotensi sel tumbuhan menjadi dasar pengembangan teknik bioteknologi modern berupa...", "opsi": ["DNA Rekombinan", "Kultur Jaringan", "Fusi Protoplas", "Kloning Hewan", "PCR (Polymerase Chain Reaction)"], "kunci": 1},
  {"id": 5, "tipe": "pg", "t": "Teknologi antibodi monoklonal dihasilkan melalui penggabungan sel limfosit B penghasil antibodi dengan sel karsinoma/mieloma. Teknik ini dikenal dengan nama...", "opsi": ["Teknik Hibridoma", "In Vitro Fertilization", "Kloning Somatik", "Transgenik", "Gena Therapy"], "kunci": 0},
  {"id": 6, "tipe": "pg", "t": "Tanaman jagung Bt tahan terhadap serangan hama ulat karena telah disisipi gen dari bakteri...", "opsi": ["Agrobacterium tumefaciens", "Bacillus thuringiensis", "Rhizobium leguminosarum", "Escherichia coli", "Streptomyces griseus"], "kunci": 1},
  {"id": 7, "tipe": "pg", "t": "Pemanfaatan mikroorganisme seperti Pseudomonas putida untuk membersihkan limbah tumpahan minyak di laut dinamakan...", "opsi": ["Bio biomagnifikasi", "Bioremediasi", "Biofertilizer", "Biopestisida", "Biometalurgi"], "kunci": 1},
  {"id": 8, "tipe": "pg", "t": "Hormon insulin manusia pertama kali diproduksi secara massal menggunakan teknologi DNA rekombinan dengan bantuan bakteri...", "opsi": ["Saccharomyces cerevisiae", "Escherichia coli", "Bacillus subtilis", "Penicillium chrysogenum", "Lactobacillus acidophilus"], "kunci": 1},
  {"id": 9, "tipe": "pg", "t": "Enzim yang berfungsi untuk menyambungkan kembali fragmen DNA yang telah dipotong ke dalam plasmid vektor adalah...", "opsi": ["DNA Ligase", "Helikase", "Taq Polimerase", "Amilase", "Lipase"], "kunci": 0},
  {"id": 10, "tipe": "pg", "t": "Dampak negatif rekayasa tanaman transgenik terhadap keanekaragaman hayati dapat terjadi apabila...", "opsi": ["Tanaman transgenik menyerbuki gulma/kerabat liar sehingga tercipta 'superweed'", "Tanaman transgenik membutuhkan air lebih sedikit", "Petani memanen hasil lebih cepat", "Lahan pertanian menjadi lebih subur", "Jumlah mikroba tanah meningkat pesat"], "kunci": 0},
  {"id": 11, "tipe": "pg", "t": "Golden Rice merupakan produk bioteknologi yang direkayasa untuk mengandung provitamin A konsentrasi tinggi guna mengatasi defisiensi vitamin A di negara berkembang. Gen pendukung beta-karoten diambil dari...", "opsi": ["Bakteri Erwinia uredovora dan Bunga Bakung (Narcissus)", "Escherichia coli dan Wortel", "Bacillus thuringiensis dan Jagung", "Saccharomyces dan Bunga Mawar", "Agrobacterium dan Padi Liar"], "kunci": 0},
  {"id": 12, "tipe": "pg", "t": "Langkah awal kultur jaringan tumbuhan yang melibatkan pengambilan bagian kecil jaringan donor dinamakan...", "opsi": ["Inokulasi", "Eksplan", "Subkultur", "Aklimatisasi", "Sterilisasi"], "kunci": 1},
  {"id": 13, "tipe": "pg", "t": "Metode kloning domba Dolly dilakukan melalui teknik...", "opsi": ["Transfer Inti Sel Somatis (Somatic Cell Nuclear Transfer)", "Inseminasi Buatan", "Fusi Protoplasma", "Fertilisasi In Vitro", "Transgenik Vektor Virus"], "kunci": 0},
  {"id": 14, "tipe": "pg", "t": "Pencemaran mikroplastik dan logam berat di perairan dapat diminimalkan dengan tanaman eceng gondok melalui mekanisme...", "opsi": ["Fitoremediasi", "Bioremediasi anaerob", "Bioleaching", "Biofertilizer", "Eutrofikasi buatan"], "kunci": 0},
  {"id": 15, "tipe": "pg", "t": "Isu bioetika utama dalam penggunaan stem cell (sel punca) embrionik manusia adalah...", "opsi": ["Pengrusakan embrio manusia pada fase blastosit", "Biaya produksi yang terlalu murah", "Efek samping yang meracuni lingkungan", "Penyebaran penyakit zoonosis", "Penurunan variasi genetik mikroba"], "kunci": 0},
  {"id": 16, "tipe": "pg", "t": "Teknik perbanyakan gen spesifik secara in vitro dengan pemanasan berulang dinamakan...", "opsi": ["PCR (Polymerase Chain Reaction)", "Elektroforesis Gel", "DNA Microarray", "Sanger Sequencing", "Northern Blotting"], "kunci": 0},
  {"id": 17, "tipe": "pg", "t": "Penggunaan mikroorganisme Thiobacillus ferrooxidans diterapkan dalam skala industri untuk...", "opsi": ["Memisahkan logam tembaga dari bijihnya (Bioleaching)", "Menguraikan plastik", "Menghasilkan antibiotik penisilin", "Mengikat gas nitrogen di udara", "Menghasilkan gas metana"], "kunci": 0},
  {"id": 18, "tipe": "pg", "t": "Keunggulan kultur jaringan dibandingkan pembiakan generatif konvensional adalah...", "opsi": ["Menghasilkan bibit identik secara genetik dalam jumlah banyak dan waktu singkat", "Meningkatkan keanekaragaman genetik tanaman", "Tidak memerlukan kondisi steril", "Membutuhkan lahan yang sangat luas", "Biaya operasional sangat murah dan tanpa peralatan lab"], "kunci": 0},
  {"id": 19, "tipe": "pg", "t": "Produk Protein Sel Tunggal (PST) yang memanfaatkan Spirulina sp. mengandalkan keunggulan...", "opsi": ["Kandungan protein tinggi dari mikroorganisme fotoautotrof", "Tahan terhadap serangan hama serangga", "Dapat mengubah sampah minyak jadi listrik", "Menghasilkan rasa daging alami", "Dapat hidup tanpa sinar matahari"], "kunci": 0},
  {"id": 20, "tipe": "pg", "t": "Vaksin generasi baru yang diproduksi dengan menyisipkan gen pengode antigen ke dalam plasmid dinamakan...", "opsi": ["Vaksin DNA / Rekombinan", "Vaksin Attenuated (Dilemahkan)", "Vaksin Inaktif", "Toksoid", "Autovaksin"], "kunci": 0},
  {"id": 21, "tipe": "jodoh", "t": "Jodohkanlah istilah bioteknologi di kolom kiri dengan deskripsi fungsinya yang tepat di kolom kanan!", "kiri": ["Enzim Restriksi", "Plasmid", "Fitoremediasi", "Totipotensi", "Hibridoma"], "kanan": ["Memotong untai DNA spesifik", "Vektor pembawa gen asing", "Pembersihan polutan dengan tanaman", "Kemampuan sel membentuk individu utuh", "Fusi sel penghasil antibodi monoklonal"]},
  {"id": 22, "tipe": "jodoh", "t": "Jodohkan mikroorganisme di kolom kiri dengan produk bioteknologinya di kolom kanan!", "kiri": ["Acetobacter xylinum", "Rhizopus oryzae", "Saccharomyces cerevisiae", "Penicillium chrysogenum", "Lactobacillus bulgaricus"], "kanan": ["Nata de Coco", "Tempe", "Roti / Tapai", "Antibiotik Penisilin", "Yoghurt"]},
  {"id": 23, "tipe": "jodoh", "t": "Jodohkan istilah kultur jaringan di kolom kiri dengan definisinya di kolom kanan!", "kiri": ["Eksplan", "Kalus", "Aklimatisasi", "Plantlet", "Sterilisasi"], "kanan": ["Bagian tanaman donor yang diisolasi", "Massa sel belum terdiferensiasi", "Penyesuaian bibit ke lingkungan luar", "Tanaman muda hasil kultur", "Bebas dari kontaminasi mikroba"]},
  {"id": 24, "tipe": "jodoh", "t": "Jodohkan aplikasi bioteknologi dengan bidang kebermanfaatannya!", "kiri": ["Tanaman Bt", "Hormon Insulin Rekombinan", "Bioremediasi Tumpahan Minyak", "Thiobacillus ferrooxidans", "Protein Sel Tunggal"], "kanan": ["Pertanian tahan hama", "Kesehatan & Farmasi", "Lingkungan", "Pertambangan / Biometalurgi", "Pangan & Nutrisi"]},
  {"id": 25, "tipe": "jodoh", "t": "Jodohkan teknik rekayasa genetika dengan prinsip dasarnya!", "kiri": ["Fusi Protoplas", "Kloning SCNT", "PCR", "DNA Rekombinan", "Gen Therapy"], "kanan": ["Peleburan dua sel tanpa dinding sel", "Transfer inti sel somatis ke oosit", "Amplifikasi molekul DNA in vitro", "Penggabungan materi genetik berbeda spesies", "Sisipan gen normal untuk koreksi penyakit"]},
  {"id": 26, "tipe": "uraian", "t": "Jelaskan tahapan utama dalam pembuatan hormon insulin manusia dengan menggunakan teknologi DNA rekombinan pada bakteri Escherichia coli!", "rubrik": "Jawaban mencakup: Isolasi gen insulin manusia, pemotongan plasmid dengan enzim restriksi, penyambungan gen dengan DNA ligase, transformasi ke sel E. coli, dan kultur/ekspresi insulin.", "kata": ["restriksi", "ligase", "plasmid", "isolasi", "transformasi", "e. coli"]},
  {"id": 27, "tipe": "uraian", "t": "Analisis dampak positif dan dampak negatif dari pengembangan Tanaman Transgenik (GMO) terhadap ekosistem pertanian dan kesehatan manusia!", "rubrik": "Dampak positif: Ketahanan hama, efisiensi pupuk, hasil tinggi. Dampak negatif: Resiko alergen, resistensi hama target, penurunan keragaman genetik lokal.", "kata": ["hama", "alergi", "resistensi", "keanekaragaman", "produksi", "gulma"]},
  {"id": 28, "tipe": "uraian", "t": "Mengapa teknik kultur jaringan tumbuhan membutuhkan kondisi aseptik yang sangat ketat? Jelaskan akibatnya jika kontaminasi mikroba terjadi!", "rubrik": "Kondisi aseptik diperlukan karena media kultur kaya nutrisi yang sangat disukai bakteri/jamur. Kontaminasi menyebabkan mikroba tumbuh cepat, memproduksi toksin, merebut nutrisi, dan membunuh eksplan.", "kata": ["aseptik", "nutrisi", "kontaminasi", "bakteri", "jamur", "eksplan", "mati"]},
  {"id": 29, "tipe": "uraian", "t": "Jelaskan prinsip kerja bioremediasi dalam menanggulangi pencemaran limbah minyak di lautan beserta peran mikroorganisme terkait!", "rubrik": "Prinsip: Mikroorganisme menguraikan hidrokarbon kompleks minyak bumi menjadi senyawa sederhana CO2 dan H2O melalui reaksi enzimatik metabolisme. Contoh bakteri: Pseudomonas putida.", "kata": ["pseudomonas", "hidrokarbon", "penguraian", "enzim", "co2", "minyak"]},
  {"id": 30, "tipe": "uraian", "t": "Bagaimana sudut pandang bioetika terhadap kloning manusia dan penggunaan sel punca (stem cell) embrionik dalam dunia medis modern?", "rubrik": "Bioetika menolak kloning manusia karena merusak martabat dan identitas individu. Penggunaan stem cell embrionik memicu debat moral terkait perusakan embrio manusia.", "kata": ["martabat", "embrio", "moral", "etika", "identitas", "hak hidup"]}
];

/* ===================== LOGIKA INTI ===================== */
var TES_MAP = {};
SOAL_TES.forEach(function (q) { TES_MAP[q.id] = q; });
var BANK = SOAL.map(function (s, i) { return { id: i + 1, p: s.p, t: s.t }; });
var BANK_MAP = {};
BANK.forEach(function (s) { BANK_MAP[s.id] = s; });

function key_(nis, kelas) { return String(nis || '').trim() + '|' + String(kelas || '').toUpperCase().replace(/\s+/g, ''); }
function acak_(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function num_(v) { return Number(v) || 0; }
function json_(v, d) { try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function sisa_(deadline) { return Math.max(0, Math.round((num_(deadline) - Date.now()) / 1000)); }
function kategori_(s) { return s >= 81 ? 'Sangat Baik' : s >= 61 ? 'Baik' : s >= 41 ? 'Cukup' : 'Kurang'; }
function cekGuru_(pw) { if (String(pw) !== String(CONFIG.PASSWORD_GURU)) throw new Error('Password guru salah.'); }
function bukti_(jenis, r, ms) { return (jenis === 'tes' ? 'UJ' : 'AN') + '-' + r.kelas + '-' + Number(ms || 0).toString(36).toUpperCase().slice(-6); }
function cekAkses_(kelas, jenis, kode) {
  var a = STORE.akses()[kelas] || {}, lbl = jenis === 'tes' ? 'ujian' : 'angket';
  if (!a[jenis] || !a.kode || String(kode || '').trim().toUpperCase() !== String(a.kode).toUpperCase())
    throw new Error('Kode akses salah, atau ' + lbl + ' untuk kelas ' + kelas + ' belum dibuka pengawas. Tanyakan kode ke pengawas.');
}
function cariToken_(token) { return STORE.peserta().filter(function (x) { return x.token === token; })[0]; }

/* ---------- TES ---------- */
function buatTes_() {
  var by = function (t) { return acak_(SOAL_TES.filter(function (q) { return q.tipe === t; })); };
  return by('pg').concat(by('jodoh'), by('uraian')).map(function (q) {
    var o = { id: q.id };
    if (q.tipe === 'pg') o.p = acak_(q.opsi.map(function (x, i) { return i; }));
    if (q.tipe === 'jodoh') o.p = acak_(q.kanan.map(function (x, i) { return i; }));
    return o;
  });
}
function sesiTes_(r) {
  return {
    tahap: 'tes', token: r.token, nama: r.nama,
    pelanggaran: num_(r.tes_pelanggaran), sisaDetik: sisa_(r.tes_deadline), jawaban: json_(r.tes_jawaban, {}),
    soal: json_(r.tes_urutan, []).map(function (u) {
      var q = TES_MAP[u.id], o = { id: q.id, tipe: q.tipe, t: q.t };
      if (q.tipe === 'pg') o.opsi = u.p.map(function (i) { return { i: i, t: q.opsi[i] }; });
      if (q.tipe === 'jodoh') { o.kiri = q.kiri.slice(); o.kanan = u.p.map(function (i) { return { i: i, t: q.kanan[i] }; }); }
      return o; // kunci jawaban TIDAK ikut dikirim
    })
  };
}
function bersihTes_(r, jw) {
  var out = {};
  jw = jw || {};
  json_(r.tes_urutan, []).forEach(function (u) {
    var q = TES_MAP[u.id], v = jw[u.id];
    if (v === undefined || v === null) return;
    if (q.tipe === 'pg') {
      v = Number(v);
      if (v >= 0 && v < q.opsi.length && Math.floor(v) === v) out[u.id] = v;
    } else if (q.tipe === 'jodoh') {
      if (typeof v !== 'object') return;
      var m = {};
      q.kiri.forEach(function (_, k) {
        var x = Number(v[k]);
        if (v[k] !== undefined && v[k] !== null && v[k] !== '' && x >= 0 && x < q.kanan.length) m[k] = x;
      });
      if (Object.keys(m).length) out[u.id] = m;
    } else {
      var s = String(v).slice(0, 4000);
      if (s.trim()) out[u.id] = s;
    }
  });
  return out;
}
function terjawabTes_(q, v) {
  if (v === undefined || v === null) return false;
  if (q.tipe === 'jodoh') return q.kiri.every(function (_, i) { return v[i] !== undefined; });
  return true;
}
function nilaiTes_(r) {
  var ur = json_(r.tes_urutan, []), jw = json_(r.tes_jawaban, {}), pg = 0, es = 0, n = 0, item = [];
  ur.forEach(function (u, idx) {
    var q = TES_MAP[u.id], v = jw[u.id], it = { no: idx + 1, tipe: q.tipe, t: q.t }, sk = 0;
    if (terjawabTes_(q, v)) n++;
    if (q.tipe === 'pg') {
      it.benar = v === q.kunci;
      sk = it.benar ? CONFIG.BOBOT_PG : 0;
      it.jawab = v === undefined ? null : q.opsi[v];
      it.kunci = q.opsi[q.kunci];
      pg += sk;
    } else if (q.tipe === 'jodoh') {
      var m = v || {}, c = 0;
      it.pasang = q.kiri.map(function (k, i) {
        var b = m[i] === i; if (b) c++;
        return { kiri: k, jawab: m[i] === undefined ? null : q.kanan[m[i]], kunci: q.kanan[i], benar: b };
      });
      sk = c / q.kiri.length * CONFIG.BOBOT_PG;
      it.benar = c === q.kiri.length;
      pg += sk;
    } else {
      var tx = String(v || '').toLowerCase();
      it.cocok = q.kata.filter(function (k) { return tx.indexOf(String(k).toLowerCase()) >= 0; });
      it.kata = q.kata; it.rubrik = q.rubrik; it.jawab = v || null;
      sk = Math.min(CONFIG.BOBOT_URAIAN, it.cocok.length / q.kata.length * CONFIG.BOBOT_URAIAN);
      es += sk;
    }
    it.skor = Math.round(sk * 10) / 10;
    item.push(it);
  });
  var p = Math.round(pg), e = Math.round(es);
  return {
    pg: p, uraian: e, total: p + e, dijawab: n, jumlah: ur.length, item: item,
    maksPg: Math.round(SOAL_TES.filter(function (q) { return q.tipe !== 'uraian'; }).length * CONFIG.BOBOT_PG),
    maksUraian: Math.round(SOAL_TES.filter(function (q) { return q.tipe === 'uraian'; }).length * CONFIG.BOBOT_URAIAN)
  };
}
function selesaiTes_(r, alasan) {
  var h = nilaiTes_(r);
  r.tes_selesai = String(Date.now());
  r.nilai_pg = h.pg; r.nilai_uraian = h.uraian; r.nilai_tes = h.total; r.tes_dijawab = h.dijawab;
  r.tes_catatan = alasan || 'manual';
  r.tes_waktu = STORE.fmt(Date.now());
  r.st_tes = 'Selesai';
  STORE.savePeserta(r);
}

/* ---------- ANGKET ---------- */
function mulaiAngketRow_(r) {
  var pos = acak_(BANK.filter(function (x) { return x.p; })).slice(0, CONFIG.JUMLAH_POSITIF);
  var neg = acak_(BANK.filter(function (x) { return !x.p; })).slice(0, CONFIG.JUMLAH_NEGATIF);
  var now = Date.now();
  r.urutan = JSON.stringify(acak_(pos.concat(neg)).map(function (x) { return x.id; }));
  r.jawaban = '{}'; r.pelanggaran = 0; r.dijawab = 0;
  r.mulai = now; r.deadline = now + CONFIG.DURASI_MENIT * 60000;
  r.st_angket = 'Angket';
  STORE.savePeserta(r);
}
function sesiAngket_(r) {
  return {
    tahap: 'angket', token: r.token, nama: r.nama,
    pelanggaran: num_(r.pelanggaran), sisaDetik: sisa_(r.deadline), jawaban: json_(r.jawaban, {}),
    soal: json_(r.urutan, []).map(function (id) { return { id: id, tipe: 'likert', t: BANK_MAP[id].t }; })
  };
}
function bersihAngket_(r, jw) {
  var out = {};
  jw = jw || {};
  json_(r.urutan, []).forEach(function (id) {
    var v = Number(jw[id]);
    if (jw[id] !== undefined && jw[id] !== null && v >= 0 && v <= 3 && Math.floor(v) === v) out[id] = v;
  });
  return out;
}
function nilaiAngket_(r) {
  var ids = json_(r.urutan, []), jw = json_(r.jawaban, {}), total = 0, n = 0;
  var item = ids.map(function (id, i) {
    var s = BANK_MAP[id], v = jw[id], nilai = 0;
    if (v !== undefined) { n++; nilai = s.p ? 4 - v : v + 1; total += nilai; }
    return { no: i + 1, t: s.t, jenis: s.p ? 'Positif' : 'Negatif', jawab: v === undefined ? null : OPSI[v], nilai: nilai };
  });
  var skor = ids.length ? Math.round(total / (ids.length * 4) * 100) : 0;
  return { dijawab: n, jumlah: ids.length, skor: skor, kategori: kategori_(skor), item: item };
}
function selesaiAngket_(r, alasan) {
  var h = nilaiAngket_(r);
  r.st_angket = 'Selesai';
  r.selesai = String(Date.now());
  r.waktu_selesai = STORE.fmt(Date.now());
  r.dijawab = h.dijawab; r.skor = h.skor; r.kategori = h.kategori;
  r.catatan = alasan || 'manual';
  STORE.savePeserta(r);
}

/* ---------- ALUR SISWA ---------- */
function mulaiTesRow_(r) {
  var now = Date.now();
  r.st_tes = 'Tes'; r.tes_mulai = now; r.tes_deadline = now + CONFIG.DURASI_TES_MENIT * 60000;
  r.tes_urutan = JSON.stringify(buatTes_()); r.tes_jawaban = '{}'; r.tes_dijawab = 0; r.tes_pelanggaran = 0;
  STORE.savePeserta(r);
}
function lanjutTes_(r) {
  if (r.st_tes === 'Selesai') return { selesai: true, jenis: 'tes', nama: r.nama, bukti: bukti_('tes', r, r.tes_selesai), pesan: 'Kamu sudah mengerjakan ujian ini sebelumnya.' };
  if (Date.now() > num_(r.tes_deadline)) {
    selesaiTes_(r, 'waktu habis');
    return { selesai: true, jenis: 'tes', nama: r.nama, pesan: 'Waktu ujian sudah habis. Jawaban yang tersimpan sudah dikirim.' };
  }
  return sesiTes_(r);
}
function lanjutAngket_(r) {
  if (r.st_angket === 'Selesai') return { selesai: true, jenis: 'angket', nama: r.nama, bukti: bukti_('angket', r, r.selesai), pesan: 'Kamu sudah mengisi angket ini sebelumnya.' };
  if (Date.now() > num_(r.deadline)) {
    selesaiAngket_(r, 'waktu habis');
    return { selesai: true, jenis: 'angket', nama: r.nama, pesan: 'Waktu angket sudah habis. Jawaban yang tersimpan sudah dikirim.' };
  }
  return sesiAngket_(r);
}

function getConfig() {
  var c = function (t) { return SOAL_TES.filter(function (q) { return q.tipe === t; }).length; };
  return {
    judul: CONFIG.JUDUL_APP, mapel: CONFIG.MAPEL, materi: CONFIG.MATERI, judulTes: CONFIG.JUDUL_TES, judulAngket: CONFIG.JUDUL,
    tes: { durasi: CONFIG.DURASI_TES_MENIT, jumlah: SOAL_TES.length, pg: c('pg'), jodoh: c('jodoh'), uraian: c('uraian') },
    durasi: CONFIG.DURASI_MENIT, jumlah: CONFIG.JUMLAH_POSITIF + CONFIG.JUMLAH_NEGATIF,
    maks: CONFIG.MAKS_PELANGGARAN, penalti: CONFIG.PENALTI_DETIK, opsi: OPSI, kelas: CONFIG.KELAS
  };
}

// jenis: 'tes' (ujian) atau 'angket'
function mulai(d, jenis, kode) {
  d = d || {};
  jenis = jenis === 'angket' ? 'angket' : 'tes';
  var nis = String(d.nis || '').trim(), nama = String(d.nama || '').trim().replace(/\s+/g, ' '), kelas = String(d.kelas || '').trim().toUpperCase();
  if (!nis || !nama || !kelas) throw new Error('Lengkapi nama, NPM, dan kelas terlebih dahulu.');
  if (CONFIG.KELAS.indexOf(kelas) < 0) throw new Error('Pilih kelas yang tersedia.');
  var key = key_(nis, kelas);
  return STORE.lock(function () {
    if (CONFIG.WAJIB_TERDAFTAR && !STORE.roster().some(function (x) { return key_(x.nis, x.kelas) === key; }))
      throw new Error('NPM ' + nis + ' tidak terdaftar di kelas ' + kelas + '. Hubungi guru.');
    var r = STORE.peserta().filter(function (x) { return x.key === key; })[0];
    if (!r || !(jenis === 'tes' ? r.st_tes : r.st_angket)) cekAkses_(kelas, jenis, kode);
    if (!r) {
      r = { key: key, nis: nis, nama: nama, kelas: kelas, token: STORE.uuid(), waktu_mulai: STORE.fmt(Date.now()), st_tes: '', st_angket: '', tes_pelanggaran: 0, pelanggaran: 0 };
      STORE.addPeserta(r);
    }
    if (jenis === 'tes') { if (!r.st_tes) mulaiTesRow_(r); return lanjutTes_(r); }
    if (!r.st_angket) mulaiAngketRow_(r);
    return lanjutAngket_(r);
  });
}

function simpanTes(token, jw, pel) {
  return STORE.lock(function () {
    var r = cariToken_(token);
    if (!r) throw new Error('Sesi tidak ditemukan.');
    if (r.st_tes !== 'Tes') return { selesai: true };
    r.tes_pelanggaran = Math.max(num_(r.tes_pelanggaran), num_(pel));
    if (Date.now() <= num_(r.tes_deadline) + 30000) {
      var b = bersihTes_(r, jw);
      r.tes_jawaban = JSON.stringify(b);
      r.tes_dijawab = json_(r.tes_urutan, []).filter(function (u) { return terjawabTes_(TES_MAP[u.id], b[u.id]); }).length;
    }
    STORE.savePeserta(r);
    return { ok: true, sisaDetik: sisa_(r.tes_deadline) };
  });
}
function kirimTes(token, jw, pel, alasan) {
  return STORE.lock(function () {
    var r = cariToken_(token);
    if (!r) throw new Error('Sesi tidak ditemukan.');
    if (r.st_tes === 'Tes') {
      r.tes_pelanggaran = Math.max(num_(r.tes_pelanggaran), num_(pel));
      if (Date.now() <= num_(r.tes_deadline) + 60000) r.tes_jawaban = JSON.stringify(bersihTes_(r, jw));
      selesaiTes_(r, alasan);
    }
    return { ok: true, bukti: bukti_('tes', r, r.tes_selesai), diterima: r.tes_waktu };
  });
}
function simpan(token, jw, pel) {
  return STORE.lock(function () {
    var r = cariToken_(token);
    if (!r) throw new Error('Sesi tidak ditemukan.');
    if (r.st_angket !== 'Angket') return { selesai: true };
    r.pelanggaran = Math.max(num_(r.pelanggaran), num_(pel));
    if (Date.now() <= num_(r.deadline) + 30000) {
      r.jawaban = JSON.stringify(bersihAngket_(r, jw));
      r.dijawab = Object.keys(json_(r.jawaban, {})).length;
    }
    STORE.savePeserta(r);
    return { ok: true, sisaDetik: sisa_(r.deadline) };
  });
}
function kirim(token, jw, pel, alasan) {
  return STORE.lock(function () {
    var r = cariToken_(token);
    if (!r) throw new Error('Sesi tidak ditemukan.');
    if (r.st_angket === 'Angket') {
      r.pelanggaran = Math.max(num_(r.pelanggaran), num_(pel));
      if (Date.now() <= num_(r.deadline) + 60000) r.jawaban = JSON.stringify(bersihAngket_(r, jw));
      selesaiAngket_(r, alasan);
    }
    return { ok: true, bukti: bukti_('angket', r, r.selesai), diterima: r.waktu_selesai };
  });
}

/* ---------- GURU ---------- */
function guruData(pw) {
  cekGuru_(pw);
  return STORE.lock(function () {
    var now = Date.now();
    var peserta = STORE.peserta().map(function (r) {
      // sesi yang ditinggal sampai waktu habis -> otomatis dinilai
      if (r.st_tes === 'Tes' && now > num_(r.tes_deadline) + 120000) selesaiTes_(r, 'waktu habis (otomatis)');
      if (r.st_angket === 'Angket' && now > num_(r.deadline) + 120000) selesaiAngket_(r, 'waktu habis (otomatis)');
      return {
        key: r.key, nis: r.nis, nama: r.nama, kelas: r.kelas, st_tes: r.st_tes || '', st_angket: r.st_angket || '',
        tes_waktu: r.tes_waktu, angket_waktu: r.waktu_selesai,
        tes_pel: num_(r.tes_pelanggaran), pel: num_(r.pelanggaran),
        nilai_tes: r.nilai_tes, nilai_pg: r.nilai_pg, nilai_uraian: r.nilai_uraian, tes_dijawab: num_(r.tes_dijawab),
        dijawab: num_(r.dijawab), skor: r.skor, kategori: r.kategori,
        tes_sisa: r.st_tes === 'Tes' ? sisa_(r.tes_deadline) : 0, angket_sisa: r.st_angket === 'Angket' ? sisa_(r.deadline) : 0,
        tes_bukti: r.st_tes === 'Selesai' ? bukti_('tes', r, r.tes_selesai) : '', angket_bukti: r.st_angket === 'Selesai' ? bukti_('angket', r, r.selesai) : ''
      };
    });
    var roster = STORE.roster().map(function (r) { return { key: key_(r.nis, r.kelas), nis: r.nis, nama: r.nama, kelas: r.kelas }; });
    return { peserta: peserta, roster: roster, sheetUrl: STORE.sheetUrl(), config: getConfig(), akses: STORE.akses() };
  });
}
function guruDetail(pw, key) {
  cekGuru_(pw);
  var r = STORE.peserta().filter(function (x) { return x.key === key; })[0];
  if (!r) throw new Error('Data siswa tidak ditemukan.');
  var out = { nis: r.nis, nama: r.nama, kelas: r.kelas, st_tes: r.st_tes || '', st_angket: r.st_angket || '' };
  if (r.tes_urutan) {
    out.tes = nilaiTes_(r);
    out.tes.pelanggaran = num_(r.tes_pelanggaran);
    out.tes.catatan = r.tes_catatan || '';
    out.tes.mulai = r.tes_mulai ? STORE.fmt(num_(r.tes_mulai)) : '';
    out.tes.selesai = r.tes_waktu || '';
    out.tes.bukti = r.st_tes === 'Selesai' ? bukti_('tes', r, r.tes_selesai) : '';
  }
  if (r.urutan) {
    out.angket = nilaiAngket_(r);
    out.angket.pelanggaran = num_(r.pelanggaran);
    out.angket.catatan = r.catatan || '';
    out.angket.mulai = r.mulai ? STORE.fmt(num_(r.mulai)) : '';
    out.angket.selesai = r.waktu_selesai || '';
    out.angket.bukti = r.st_angket === 'Selesai' ? bukti_('angket', r, r.selesai) : '';
  }
  return out;
}
function guruSetAkses(pw, kelas, o) {
  cekGuru_(pw);
  if (CONFIG.KELAS.indexOf(kelas) < 0) throw new Error('Kelas tidak dikenal.');
  o = o || {};
  var kode = String(o.kode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if ((o.tes || o.angket) && kode.length < 4) throw new Error('Kode akses minimal 4 huruf/angka.');
  return STORE.lock(function () { STORE.setAkses(kelas, { kode: kode, tes: !!o.tes, angket: !!o.angket }); return { ok: true }; });
}
// jenis: 'tes' = ulang ujian saja, 'angket' = ulang angket saja
function guruReset(pw, key, jenis) {
  cekGuru_(pw);
  return STORE.lock(function () {
    var r = STORE.peserta().filter(function (x) { return x.key === key; })[0];
    if (!r) return { ok: true };
    var F = jenis === 'angket' ? ['st_angket', 'mulai', 'deadline', 'selesai', 'urutan', 'jawaban', 'pelanggaran', 'dijawab', 'skor', 'kategori', 'catatan', 'waktu_selesai']
      : ['st_tes', 'tes_mulai', 'tes_deadline', 'tes_selesai', 'tes_urutan', 'tes_jawaban', 'tes_pelanggaran', 'tes_dijawab', 'nilai_pg', 'nilai_uraian', 'nilai_tes', 'tes_catatan', 'tes_waktu'];
    F.forEach(function (f) { r[f] = ''; });
    if (!r.st_tes && !r.st_angket) STORE.removePeserta(r); else STORE.savePeserta(r);
    return { ok: true };
  });
}

/* ---------- KELOLA SISWA ---------- */
function siswa_(d) {
  d = d || {};
  var o = { nis: String(d.nis || '').trim(), nama: String(d.nama || '').trim().replace(/\s+/g, ' '), kelas: String(d.kelas || '').trim().toUpperCase() };
  if (!o.nis) throw new Error('NPM wajib diisi.');
  if (!o.nama) throw new Error('Nama wajib diisi.');
  if (CONFIG.KELAS.indexOf(o.kelas) < 0) throw new Error('Kelas harus salah satu dari: ' + CONFIG.KELAS.join(', ') + '.');
  return o;
}
function guruTambahSiswa(pw, d) {
  cekGuru_(pw);
  var o = siswa_(d);
  return STORE.lock(function () {
    if (STORE.roster().some(function (r) { return r.nis === o.nis; })) throw new Error('NPM ' + o.nis + ' sudah terdaftar.');
    STORE.addRoster([o]);
    return { ok: true };
  });
}
function guruEditSiswa(pw, npmLama, d) {
  cekGuru_(pw);
  var o = siswa_(d);
  return STORE.lock(function () {
    var all = STORE.roster(), r = all.filter(function (x) { return x.nis === String(npmLama); })[0];
    if (!r) throw new Error('Siswa tidak ditemukan.');
    if (o.nis !== r.nis && all.some(function (x) { return x.nis === o.nis; })) throw new Error('NPM ' + o.nis + ' sudah dipakai siswa lain.');
    r.nis = o.nis; r.nama = o.nama; r.kelas = o.kelas;
    STORE.saveRoster(r);
    return { ok: true };
  });
}
function guruHapusSiswa(pw, npm) {
  cekGuru_(pw);
  return STORE.lock(function () {
    var r = STORE.roster().filter(function (x) { return x.nis === String(npm); })[0];
    if (r) STORE.removeRoster(r);
    return { ok: true };
  });
}
function guruImportSiswa(pw, text) {
  cekGuru_(pw);
  return STORE.lock(function () {
    var ada = {}, baru = [], dilewati = 0;
    STORE.roster().forEach(function (r) { ada[r.nis] = 1; });
    String(text || '').split(/\r?\n/).forEach(function (l) {
      if (!l.trim()) return;
      var c = l.split(/\t|;|,/).map(function (x) { return x.trim(); });
      if (/^(nis|npm)$/i.test(c[0])) return; // baris judul
      try {
        var o = siswa_({ nis: c[0], nama: c[1], kelas: c[2] });
        if (ada[o.nis]) { dilewati++; return; }
        ada[o.nis] = 1; baru.push(o);
      } catch (e) { dilewati++; }
    });
    if (baru.length) STORE.addRoster(baru);
    return { ditambah: baru.length, dilewati: dilewati };
  });
}

/* ===================== PENYIMPANAN GOOGLE SHEET ===================== */
var H_PESERTA = ['key', 'nis', 'nama', 'kelas', 'st_tes', 'st_angket', 'token', 'waktu_mulai',
  'tes_waktu', 'tes_mulai', 'tes_deadline', 'tes_selesai', 'tes_urutan', 'tes_jawaban', 'tes_pelanggaran', 'tes_dijawab',
  'nilai_pg', 'nilai_uraian', 'nilai_tes', 'tes_catatan',
  'mulai', 'deadline', 'selesai', 'waktu_selesai', 'urutan', 'jawaban', 'pelanggaran', 'dijawab', 'skor', 'kategori', 'catatan'];
var H_DAFTAR = ['nis', 'nama', 'kelas'];
var H_AKSES = ['kelas', 'kode', 'tes', 'angket'];

function doGet(e) {
  var q = (e && e.parameter) || {};
  var app = q.app === 'angket' ? 'Angket' : (q.app === 'ujian' || q.app === 'tes') ? 'Ujian' : '';
  var names = (app ? [app, app.toLowerCase()] : []).concat(['Ujian', 'ujian', 'Angket', 'angket', 'Index', 'index']);
  var t = null;
  for (var i = 0; i < names.length && !t; i++) { try { t = HtmlService.createTemplateFromFile(names[i]); } catch (err) {} }
  if (!t) return HtmlService.createHtmlOutput('File HTML belum ada. Buat file HTML bernama Ujian atau Angket di Apps Script.');
  var p = q.page;
  t.page = (p === 'guru' || p === 'tes' || p === 'angket') ? p : 'pilih';
  return t.evaluate()
    .setTitle(CONFIG.JUDUL_APP)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Bisa dipakai dari Apps Script yang menempel di Google Sheet maupun yang berdiri sendiri.
// Jika berdiri sendiri, Google Sheet "Data Ujian & Angket Bioteknologi" dibuat otomatis di Drive-mu.
function ss_() {
  var a = SpreadsheetApp.getActive();
  if (a) return a;
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var baru = SpreadsheetApp.create('Data Ujian & Angket Bioteknologi');
  p.setProperty('SHEET_ID', baru.getId());
  return baru;
}
function sheet_(name, headers) {
  var ss = ss_();
  var s = ss.getSheetByName(name);
  if (s) {
    var h = s.getRange(1, 1, 1, Math.max(1, s.getLastColumn())).getDisplayValues()[0];
    if (h.slice(0, headers.length).join('|') !== headers.join('|')) {
      // struktur kolom lama -> simpan sebagai arsip, buat sheet baru
      s.setName(name + ' (lama ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm') + ')');
      s = null;
    }
  }
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}
function rows_(s) {
  var v = s.getDataRange().getDisplayValues();
  var h = v.shift() || [];
  var out = [];
  v.forEach(function (r, i) {
    if (r.join('') === '') return;
    var o = { _row: i + 2 };
    h.forEach(function (k, j) { o[k] = r[j]; });
    out.push(o);
  });
  return out;
}
function ensureRows_(s, last) {
  if (last > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), last - s.getMaxRows() + 100);
}
function writeObj_(s, headers, obj, row) {
  var idx = row || s.getLastRow() + 1;
  ensureRows_(s, idx);
  var vals = headers.map(function (k) { return (obj[k] === undefined || obj[k] === null) ? '' : String(obj[k]); });
  s.getRange(idx, 1, 1, vals.length).setNumberFormat('@').setValues([vals]);
  return idx;
}

var STORE = {
  _p: null, _d: null,
  ps: function () { return this._p || (this._p = sheet_('Peserta', H_PESERTA)); },
  ds: function () { return this._d || (this._d = sheet_('DaftarSiswa', H_DAFTAR)); },
  peserta: function () { return rows_(this.ps()); },
  addPeserta: function (r) { r._row = writeObj_(this.ps(), H_PESERTA, r); },
  savePeserta: function (r) { r._row = writeObj_(this.ps(), H_PESERTA, r, r._row); },
  removePeserta: function (r) { this.ps().deleteRow(r._row); },
  roster: function () { return rows_(this.ds()); },
  addRoster: function (list) {
    var s = this.ds(), start = s.getLastRow() + 1;
    ensureRows_(s, start + list.length);
    s.getRange(start, 1, list.length, 3).setNumberFormat('@')
      .setValues(list.map(function (o) { return [o.nis, o.nama, o.kelas]; }));
  },
  saveRoster: function (r) { writeObj_(this.ds(), H_DAFTAR, r, r._row); },
  removeRoster: function (r) { this.ds().deleteRow(r._row); },
  akses: function () {
    var out = {};
    rows_(sheet_('Akses', H_AKSES)).forEach(function (r) { out[r.kelas] = { kode: r.kode, tes: r.tes === 'TRUE', angket: r.angket === 'TRUE', _row: r._row }; });
    return out;
  },
  setAkses: function (kelas, o) {
    var s = sheet_('Akses', H_AKSES), a = this.akses()[kelas];
    writeObj_(s, H_AKSES, { kelas: kelas, kode: o.kode, tes: o.tes ? 'TRUE' : 'FALSE', angket: o.angket ? 'TRUE' : 'FALSE' }, a && a._row);
  },
  lock: function (fn) {
    var lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try { return fn(); } finally { lock.releaseLock(); }
  },
  fmt: function (ms) { return Utilities.formatDate(new Date(Number(ms)), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'); },
  uuid: function () { return Utilities.getUuid(); },
  sheetUrl: function () { return ss_().getUrl(); }
};
