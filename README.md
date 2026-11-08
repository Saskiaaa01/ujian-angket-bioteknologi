# Aplikasi Ujian & Angket Bioteknologi

Aplikasi web untuk **Ujian Harian Bioteknologi** (30 soal) dan **Angket Pembelajaran Bioteknologi** (20 pernyataan) bagi siswa SMA. Aplikasi bisa dibuka di Android, iPhone, dan laptop tanpa instalasi. Nilai dihitung otomatis dan dipantau guru lewat dasbor.

Dibuat oleh **Yosi Maulana**, Program Studi Sistem Informasi, Universitas Bina Sarana Informatika (UBSI) Kampus Kota Tasikmalaya.

## Fitur

- Identitas siswa (nama, NPM, kelas A–E), kode akses per kelas, dan pernyataan kejujuran
- Soal diacak per siswa: urutan soal, opsi pilihan ganda, dan pasangan menjodohkan
- Tiga jenis soal ujian: pilihan ganda, menjodohkan, dan uraian (dinilai dari kata kunci)
- Angket dengan pernyataan positif dan negatif yang tersamar; 10 + 10 diambil acak dari 24
- Timer dari server, bebas pindah nomor, tombol **Tandai**, dan mode **latihan**
- Anti mencontek: alarm, getar, layar dikunci, pelanggaran dicatat, dikumpulkan otomatis setelah 5 kali
- Simpan otomatis, lanjutkan sesi, bukti penerimaan, dan kirim ulang saat internet putus
- Dasbor guru: pemantauan langsung, rekap nilai, detail jawaban, Akses Kelas, Kelola Siswa, ekspor CSV

## Struktur

```
apps-script/
  Code.gs        server: soal, kunci, penilaian, penyimpanan ke Google Sheet
  Index.html     Versi 1: 2 halaman siswa + 1 halaman guru (gabungan)
  Ujian.html     Versi 2: aplikasi ujian + guru ujian
  Angket.html    Versi 2: aplikasi angket + guru angket
demo/
  index.html     demo gabungan (data hanya di browser, tanpa server)
  ujian.html     demo ujian
  angket.html    demo angket
```

## Cara pasang (Google Apps Script)

1. Buka [script.google.com](https://script.google.com), lalu klik **Project baru**.
2. Tempel isi `apps-script/Code.gs` ke file `.gs`.
3. Buat file HTML:
   - Versi 1: satu file bernama `Index`, isi dengan `Index.html`.
   - Versi 2: dua file bernama `Ujian` dan `Angket`.
4. Ganti `PASSWORD_GURU` di bagian `CONFIG`.
5. Klik **Terapkan → Deployment baru → Aplikasi web**, isi "Jalankan sebagai: **Saya**" dan "Akses: **Siapa saja**".

| Untuk | Versi 1 | Versi 2 |
|---|---|---|
| Siswa | `…/exec`, `?page=tes`, `?page=angket` | `…/exec?app=ujian`, `…/exec?app=angket` |
| Guru | `…/exec?page=guru` | `…/exec?app=ujian&page=guru`, `…/exec?app=angket&page=guru` |

Sebelum ujian, buka dasbor guru → **Akses Kelas**, isi kode, lalu buka kelasnya.

## Demo

File di folder `demo/` bisa dibuka langsung di browser atau lewat GitHub Pages. Datanya hanya tersimpan di browser.

- Password guru: `guru123`
- Kode akses kelas A/B: `BIO123`
- Halaman guru: tambahkan `#guru` di akhir alamat

## Teknologi

HTML, CSS, JavaScript · Google Apps Script · Google Sheet

## Penting

`Code.gs` dan file demo **berisi kunci jawaban dan password guru**. Simpan repository ini sebagai **Private** jika soalnya akan dipakai untuk ujian sungguhan.
