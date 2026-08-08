# Panduan Deploy Firestore Rules — v2.7.0

File `firestore.rules` di package ini sudah berisi versi terbaru (rule
`counter_surat` sudah dihapus). Tapi file di ZIP saja **tidak otomatis
aktif** di Firebase — perlu di-deploy secara terpisah. Pilih SALAH SATU
cara di bawah, mana yang lebih mudah untuk Bapak.

---

## Cara 1 — Firebase CLI (paling cepat, kalau sudah pernah pakai sebelumnya)

Jalankan dari root folder project (setelah extract ZIP ini di atasnya):

```bash
# Kalau belum pernah install Firebase CLI di komputer ini:
npm install -g firebase-tools

# Login (buka browser sekali untuk otorisasi akun Google yang punya akses ke project Firebase):
firebase login

# Pastikan project yang aktif benar (dapendig / sesuai nama project Firebase Bapak):
firebase use --add
# → pilih project Firebase yang sesuai dari daftar yang muncul

# Deploy HANYA rules (tidak menyentuh apa pun yang lain):
firebase deploy --only firestore:rules
```

Kalau berhasil, akan muncul pesan seperti `✔ Deploy complete!`. Selesai —
tidak perlu langkah lain.

---

## Cara 2 — Firebase Console (browser biasa, tanpa install apa pun)

1. Buka **console.firebase.google.com**, login dengan akun Google yang
   punya akses ke project Firebase desa (project yang sama dipakai
   DaPenDig Next).
2. Di sidebar kiri, klik **Firestore Database**.
3. Klik tab **Rules** di bagian atas.
4. Akan terlihat editor teks berisi rules yang sedang aktif sekarang.
   **Hapus semua isi editor itu**, lalu **paste** persis teks di bawah ini
   menggantikannya:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAllowed() {
      return request.auth != null && request.auth.uid in [
        'dzQ7vIVsTEbtfgML286w9MmUGqz2',
        'ZDX7bXzB95hBMv99Q5OxkXwJfmf2',
        'lZqlErwDKiSWXphAfAcI9uTgQKt2',
        'sdcHroGRTeZQxeQOtmJzMzmskP62',
        'YA7qQvgouLZYyAap44Z0I1kWTx43'
      ];
    }
    function role() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    function isAdmin() { return isAllowed() && role() == 'admin'; }
    function isOperator() { return isAllowed() && role() in ['admin','operator']; }
    function isViewer() { return isAllowed() && role() in ['admin','operator','viewer']; }

    match /penduduk/{nik} {
      allow read: if isViewer();
      allow create,update: if isOperator();
      allow delete: if isAdmin();
    }
    match /mutasi_keluar/{id} {
      allow read: if isViewer();
      allow create: if isOperator();
      allow update,delete: if isAdmin();
    }
    match /mutasi_masuk/{id} {
      allow read: if isViewer();
      allow create: if isOperator();
      allow update,delete: if isAdmin();
    }
    match /lahir/{id} {
      allow read: if isViewer();
      allow create: if isOperator();
      allow update,delete: if isAdmin();
    }
    match /meninggal/{id} {
      allow read: if isViewer();
      allow create: if isOperator();
      allow update,delete: if isAdmin();
    }
    match /log/{id} {
      allow read: if isViewer();
      allow create: if isOperator();
      allow update,delete: if isAdmin();
    }
    match /config/{doc} {
      allow read: if isAllowed();
      allow write: if isAdmin();
    }
    match /users/{uid} {
      allow read: if isAllowed();
      allow write: if isAdmin();
    }
    match /recycle_bin/{id} {
      allow read: if isViewer();
      allow create: if isOperator();
      allow delete: if isAdmin();
    }
  }
}
```

5. Klik tombol **Publish** di kanan atas editor.
6. Akan muncul dialog konfirmasi — klik **Publish** sekali lagi untuk
   memastikan.

Selesai — rules baru langsung aktif dalam beberapa detik, tidak perlu
redeploy aplikasi web-nya sama sekali (rules dan kode aplikasi adalah dua
sistem terpisah di Firebase).

---

## Cara verifikasi setelah deploy (opsional tapi disarankan)

Buka menu **Rules** di Firestore Console lagi, cari teks `counter_surat` —
seharusnya sudah tidak ditemukan sama sekali di rules yang aktif.
