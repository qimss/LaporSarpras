import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

const results = [];

function recordTest(scenario, testName, passed, details = '') {
  results.push({ scenario, testName, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] [${scenario}] ${testName} ${details ? `(${details})` : ''}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🧪 MEMULAI PENGUJIAN LENGKAP SELURUH SKENARIO WEB LAPORSARPRAS');
  console.log('================================================================\n');

  // Launch the server in a child process
  console.log('⏳ Menjalankan Backend Express Server...');
  const serverProcess = spawn('node', ['app.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, APP_PORT: '3000' },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log(`[Server] ${d.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (d) => {
    // console.error(`[Server Err] ${d.toString().trim()}`);
  });

  // Wait for server to be responsive
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      await axios.get(`${API_URL}/auth/me`);
      serverReady = true;
      break;
    } catch (e) {
      if (e.response) {
        serverReady = true;
        break;
      }
      await sleep(500);
    }
  }

  if (!serverReady) {
    console.error('❌ Server gagal dijalankan dalam waktu 15 detik.');
    serverProcess.kill();
    process.exit(1);
  }
  console.log('🚀 Server aktif dan siap menerima pengujian!\n');

  try {
    // Axios clients with cookie jar emulation
    let mhsCookie = '';
    let adminCookie = '';

    const anonClient = axios.create({ baseURL: API_URL, validateStatus: () => true });
    const mhsClient = axios.create({ baseURL: API_URL, validateStatus: () => true });
    const adminClient = axios.create({ baseURL: API_URL, validateStatus: () => true });

    // =========================================================================
    // SKENARIO 1: AUTENTIKASI & ROLE-BASED ACCESS CONTROL (RBAC)
    // =========================================================================
    console.log('\n--- 🔐 SKENARIO 1: AUTENTIKASI & RBAC ---');

    // 1.1 Login Mahasiswa dengan NIM
    const res1_1 = await anonClient.post('/auth/login', {
      identifier: '20240140151',
      password: 'password123',
    });
    const pass1_1 = res1_1.status === 200 && res1_1.data.success && res1_1.data.user.role === 'mahasiswa';
    if (pass1_1 && res1_1.headers['set-cookie']) {
      mhsCookie = res1_1.headers['set-cookie'][0].split(';')[0];
    }
    recordTest('SKENARIO 1', '1.1 Login Mahasiswa via NIM', pass1_1, `Role: ${res1_1.data.user?.role}`);

    // 1.2 Login Mahasiswa dengan Email Kampus
    const res1_2 = await anonClient.post('/auth/login', {
      identifier: 'rasyid.aqim@mail.umy.ac.id',
      password: 'password123',
    });
    const pass1_2 = res1_2.status === 200 && res1_2.data.success && res1_2.data.user.nim === '20240140151';
    recordTest('SKENARIO 1', '1.2 Login Mahasiswa via Email Kampus', pass1_2, `NIM: ${res1_2.data.user?.nim}`);

    // 1.3 Login Admin dengan Username / ID Staf
    const res1_3 = await anonClient.post('/auth/login', {
      identifier: 'admin_sarpras',
      password: 'password123',
    });
    const pass1_3 = res1_3.status === 200 && res1_3.data.success && res1_3.data.user.role === 'admin';
    if (pass1_3 && res1_3.headers['set-cookie']) {
      adminCookie = res1_3.headers['set-cookie'][0].split(';')[0];
    }
    recordTest('SKENARIO 1', '1.3 Login Admin via ID Staf (admin_sarpras)', pass1_3, `Role: ${res1_3.data.user?.role}`);

    // 1.4 Login Admin dengan Email Resmi
    const res1_4 = await anonClient.post('/auth/login', {
      identifier: 'sarpras@umy.ac.id',
      password: 'password123',
    });
    const pass1_4 = res1_4.status === 200 && res1_4.data.success && res1_4.data.user.role === 'admin';
    recordTest('SKENARIO 1', '1.4 Login Admin via Email Resmi (sarpras@umy.ac.id)', pass1_4, `Role: ${res1_4.data.user?.role}`);

    // 1.5 Cek Sesi Mahasiswa (/api/auth/me)
    const res1_5 = await anonClient.get('/auth/me', { headers: { Cookie: mhsCookie } });
    const pass1_5 = res1_5.status === 200 && res1_5.data.success && res1_5.data.user.role === 'mahasiswa';
    recordTest('SKENARIO 1', '1.5 Verifikasi Sesi Mahasiswa (/api/auth/me)', pass1_5, `Nama: ${res1_5.data.user?.nama_lengkap}`);

    // 1.6 Cek Sesi Admin (/api/auth/me)
    const res1_6 = await anonClient.get('/auth/me', { headers: { Cookie: adminCookie } });
    const pass1_6 = res1_6.status === 200 && res1_6.data.success && res1_6.data.user.role === 'admin';
    recordTest('SKENARIO 1', '1.6 Verifikasi Sesi Admin (/api/auth/me)', pass1_6, `Nama: ${res1_6.data.user?.nama_lengkap}`);

    // 1.7 Login Gagal - Password Salah
    const res1_7 = await anonClient.post('/auth/login', {
      identifier: '20240140151',
      password: 'passwordsalah123',
    });
    const pass1_7 = res1_7.status === 401 && res1_7.data.success === false;
    recordTest('SKENARIO 1', '1.7 Login Ditolak - Kata Sandi Salah', pass1_7, `Status: ${res1_7.status}`);

    // 1.7b Keamanan: Uji Coba Bypass Kata Sandi Hardcoded (admin123 / mahasiswa123) Wajib Ditolak
    const res1_7b = await anonClient.post('/auth/login', {
      identifier: '20240140151',
      password: 'admin123',
    });
    const pass1_7b = res1_7b.status === 401 && res1_7b.data.success === false;
    recordTest('SKENARIO 1', '1.7b Keamanan: Percobaan Bypass Backdoor (admin123) Ditolak', pass1_7b, `Status: ${res1_7b.status} Unauthorized`);

    // 1.8 Login Gagal - Akun Tidak Terdaftar
    const res1_8 = await anonClient.post('/auth/login', {
      identifier: '99999999999',
      password: 'password123',
    });
    const pass1_8 = res1_8.status === 401 && res1_8.data.success === false;
    recordTest('SKENARIO 1', '1.8 Login Ditolak - Identitas Tidak Terdaftar', pass1_8, `Status: ${res1_8.status}`);

    // 1.9 Login Gagal - Kolom Kosong
    const res1_9 = await anonClient.post('/auth/login', {
      identifier: '',
      password: '',
    });
    const pass1_9 = res1_9.status === 400 && res1_9.data.success === false;
    recordTest('SKENARIO 1', '1.9 Login Ditolak - Input Kosong Validasi', pass1_9, `Status: ${res1_9.status}`);

    // 1.10 Proteksi RBAC Server-Side: Mahasiswa Ditolak Akses Admin Dashboard
    const res1_10 = await anonClient.get('/admin/dashboard', { headers: { Cookie: mhsCookie } });
    const pass1_10 = res1_10.status === 403 && res1_10.data.success === false;
    recordTest('SKENARIO 1', '1.10 Proteksi RBAC: Mahasiswa Dilarang Akses Admin Dashboard', pass1_10, `Status: ${res1_10.status} Forbidden`);

    // 1.11 Proteksi RBAC Server-Side: Tamu Tanpa Sesi Ditolak Akses Admin Dashboard
    const res1_11 = await anonClient.get('/admin/dashboard');
    const pass1_11 = res1_11.status === 403 && res1_11.data.success === false;
    recordTest('SKENARIO 1', '1.11 Proteksi RBAC: Tamu Tanpa Sesi Dilarang Akses Admin Dashboard', pass1_11, `Status: ${res1_11.status} Forbidden`);

    // 1.12 Logout Pengguna
    const res1_12 = await anonClient.post('/auth/logout', {}, { headers: { Cookie: mhsCookie } });
    const pass1_12 = res1_12.status === 200 && res1_12.data.success === true;
    recordTest('SKENARIO 1', '1.12 Logout Berhasil Menghancurkan Sesi', pass1_12, `Message: ${res1_12.data.message}`);

    // Re-login Mahasiswa for subsequent scenarios
    const reLoginMhs = await anonClient.post('/auth/login', {
      identifier: '20240140151',
      password: 'password123',
    });
    mhsCookie = reLoginMhs.headers['set-cookie'][0].split(';')[0];


    // =========================================================================
    // SKENARIO 2: PELAPORAN KERUSAKAN FASILITAS OLEH MAHASISWA
    // =========================================================================
    console.log('\n--- 📝 SKENARIO 2: PELAPORAN MAHASISWA & VALIDASI KEAMANAN ---');

    let ticketNormal1 = '';
    let reportIdNormal1 = null;

    // 2.1 Buat Laporan Normal (AC Bocor)
    const res2_1 = await anonClient.post(
      '/reports',
      {
        kode_lokasi: 'Gedung F6 L2 R.204',
        nama_fasilitas: 'Pendingin Ruangan (AC)',
        deskripsi_kerusakan: 'AC mengeluarkan tetesan air deras dan ruangan gerah tidak dingin',
        is_urgent_claimed: false,
      },
      { headers: { Cookie: mhsCookie } }
    );
    const pass2_1 = res2_1.status === 201 && res2_1.data.success && res2_1.data.report.ticket_number;
    if (pass2_1) {
      ticketNormal1 = res2_1.data.report.ticket_number;
      reportIdNormal1 = res2_1.data.report.report_id;
    }
    recordTest('SKENARIO 2', '2.1 Input Laporan Normal (AC Bocor)', pass2_1, `Tiket: #${ticketNormal1}`);

    // 2.2 Buat Laporan Normal ke-2 pada Lokasi & Fasilitas Sama (Untuk Uji AI Clustering)
    let ticketNormal2 = '';
    const res2_2 = await anonClient.post(
      '/reports',
      {
        kode_lokasi: 'Gedung F6 L2 R.204',
        nama_fasilitas: 'Pendingin Ruangan (AC)',
        deskripsi_kerusakan: 'Rembean air dari AC mengenai meja kuliah baris depan',
        is_urgent_claimed: false,
      },
      { headers: { Cookie: mhsCookie } }
    );
    const pass2_2 = res2_2.status === 201 && res2_2.data.success && res2_2.data.report.ticket_number;
    if (pass2_2) {
      ticketNormal2 = res2_2.data.report.ticket_number;
    }
    recordTest('SKENARIO 2', '2.2 Input Laporan Serupa di Lokasi Sama (Persiapan AI Clustering)', pass2_2, `Tiket: #${ticketNormal2}`);

    // 2.3 Validasi Keamanan: Sanitasi Anti-XSS (Karakter Berbahaya Dihapus Bersih)
    const res2_3 = await anonClient.post(
      '/reports',
      {
        kode_lokasi: "<script>alert('xss')</script> Gedung E3",
        nama_fasilitas: 'Lampu Penerangan',
        deskripsi_kerusakan: 'Lampu kedip-kedip redup',
        is_urgent_claimed: false,
      },
      { headers: { Cookie: mhsCookie } }
    );
    const lokasiHasilSanitasi = res2_3.data.report?.kode_lokasi || '';
    const isCleanFromXSS = !lokasiHasilSanitasi.includes('<') && !lokasiHasilSanitasi.includes('>') && !lokasiHasilSanitasi.includes("'") && !lokasiHasilSanitasi.includes('"');
    const pass2_3 = res2_3.status === 201 && isCleanFromXSS;
    recordTest('SKENARIO 2', '2.3 Validasi Anti-XSS Sanitasi Ruangan', pass2_3, `Tersanitasi menjadi: "${lokasiHasilSanitasi}"`);

    // 2.4 Validasi Keamanan: Pemotongan Batas Maksimal 35 Karakter Lokasi
    const inputPanjang = 'Gedung Sang Pencerah Lantai 5 Sayap Barat Ruang Serbaguna 501';
    const res2_4 = await anonClient.post(
      '/reports',
      {
        kode_lokasi: inputPanjang,
        nama_fasilitas: 'Kursi Kuliah',
        deskripsi_kerusakan: 'Sandaran kursi patah',
        is_urgent_claimed: false,
      },
      { headers: { Cookie: mhsCookie } }
    );
    const panjangHasil = res2_4.data.report?.kode_lokasi?.length || 0;
    const pass2_4 = res2_4.status === 201 && panjangHasil <= 35;
    recordTest('SKENARIO 2', '2.4 Validasi Pemotongan Maksimal 35 Karakter', pass2_4, `Panjang input: ${inputPanjang.length} -> Hasil: ${panjangHasil} char`);

    // 2.5 Validasi Form: Tolak Laporan Tanpa Fasilitas / Deskripsi
    const res2_5 = await anonClient.post(
      '/reports',
      {
        kode_lokasi: 'Gedung F1 R.101',
        nama_fasilitas: '',
        deskripsi_kerusakan: '',
      },
      { headers: { Cookie: mhsCookie } }
    );
    const pass2_5 = res2_5.status === 400 && res2_5.data.success === false;
    recordTest('SKENARIO 2', '2.5 Penolakan Input Form yang Tidak Lengkap', pass2_5, `Status: ${res2_5.status} Bad Request`);

    // 2.6 Buat Laporan Kondisi Mendesak (Red Alert Triage)
    let ticketUrgent = '';
    let reportIdUrgent = null;
    const res2_6 = await anonClient.post(
      '/reports',
      {
        kode_lokasi: 'Gedung F6 L1 Ruang Server',
        nama_fasilitas: 'Instalasi Listrik & Pipa',
        deskripsi_kerusakan: 'Pipa air bocor tepat di atas rak server dan tercium bau kabel terbakar menyengat',
        is_urgent_claimed: true,
        jenis_bahaya: 'Korsleting Listrik & Kebocoran Server',
        durasi_masalah: '< 1 jam',
      },
      { headers: { Cookie: mhsCookie } }
    );
    const pass2_6 = res2_6.status === 201 && res2_6.data.success && res2_6.data.report.status === 'Dugaan Mendesak';
    if (pass2_6) {
      ticketUrgent = res2_6.data.report.ticket_number;
      reportIdUrgent = res2_6.data.report.report_id;
    }
    recordTest('SKENARIO 2', '2.6 Input Laporan Red Alert (Kondisi Mendesak)', pass2_6, `Tiket: #${ticketUrgent}, Status: ${res2_6.data.report?.status}`);


    // =========================================================================
    // SKENARIO 3: PELACAKAN TIKET PUBLIK (PUBLIC TRACKING TIMELINE)
    // =========================================================================
    console.log('\n--- 🔍 SKENARIO 3: PELACAKAN PUBLIK (TRACKING TIMELINE) ---');

    // 3.1 Lacak Tiket Normal Publik Tanpa Sesi Login
    const res3_1 = await anonClient.get(`/reports/${ticketNormal1}`);
    const pass3_1 = res3_1.status === 200 && res3_1.data.success && res3_1.data.stepIndex === 1 && res3_1.data.report.ticket_number === ticketNormal1;
    recordTest('SKENARIO 3', '3.1 Pelacakan Publik Tanpa Login (Tiket Normal)', pass3_1, `Step Linimasa: ${res3_1.data.stepIndex}/4 (${res3_1.data.report?.status})`);

    // 3.2 Lacak Tiket Kedaruratan Publik Tanpa Sesi Login
    const res3_2 = await anonClient.get(`/reports/${ticketUrgent}`);
    const pass3_2 = res3_2.status === 200 && res3_2.data.success && res3_2.data.report.is_urgent_claimed === true;
    recordTest('SKENARIO 3', '3.2 Pelacakan Publik Tiket Kedaruratan', pass3_2, `Status: ${res3_2.data.report?.status}, Urgent: ${res3_2.data.report?.is_urgent_claimed}`);

    // 3.3 Lacak Nomor Tiket yang Tidak Ada
    const res3_3 = await anonClient.get('/reports/TKT-99999999-9999');
    const pass3_3 = res3_3.status === 404 && res3_3.data.success === false;
    recordTest('SKENARIO 3', '3.3 Respon 404 Tiket Tidak Ditemukan', pass3_3, `Status: ${res3_3.status} Not Found`);


    // =========================================================================
    // SKENARIO 4: RIWAYAT PENGADUAN MAHASISWA ("LAPORAN SAYA")
    // =========================================================================
    console.log('\n--- 📂 SKENARIO 4: RIWAYAT PENGADUAN MAHASISWA ---');

    // 4.1 Ambil Riwayat Laporan Mahasiswa Login
    const res4_1 = await anonClient.get('/reports/my', { headers: { Cookie: mhsCookie } });
    const userReports = res4_1.data.reports || [];
    const hasMyTickets = userReports.some((r) => r.ticket_number === ticketNormal1);
    const pass4_1 = res4_1.status === 200 && res4_1.data.success && hasMyTickets;
    recordTest('SKENARIO 4', '4.1 Pengambilan Riwayat Laporan Pengguna Aktif', pass4_1, `Total Laporan: ${userReports.length}`);

    // 4.2 Akses Riwayat Tanpa Sesi Ditolak
    const res4_2 = await anonClient.get('/reports/my');
    const pass4_2 = res4_2.status === 401 && res4_2.data.success === false;
    recordTest('SKENARIO 4', '4.2 Penolakan Akses Riwayat Tanpa Sesi Login', pass4_2, `Status: ${res4_2.status} Unauthorized`);


    // =========================================================================
    // SKENARIO 5: PUSAT KENDALI OPERASIONAL ADMIN SARPRAS
    // =========================================================================
    console.log('\n--- 🏛️ SKENARIO 5: OPERASIONAL ADMIN SARPRAS & AI CLUSTERING ---');

    // 5.1 Admin Dashboard: KPIs, Triage List, & All Reports
    const res5_1 = await anonClient.get('/admin/dashboard', { headers: { Cookie: adminCookie } });
    const pass5_1 = res5_1.status === 200 && res5_1.data.success && res5_1.data.kpis && res5_1.data.emergencyList;
    recordTest('SKENARIO 5', '5.1 Akses Dashboard Admin & Metrik KPI', pass5_1, `Total: ${res5_1.data.kpis?.total}, Mendesak: ${res5_1.data.kpis?.urgent}`);

    // 5.2 Triage Kedaruratan: Verifikasi Kedaruratan (Action: verify)
    const res5_2 = await anonClient.post(
      `/admin/triage/${reportIdUrgent}`,
      { action: 'verify', catatan: 'Tim darurat ditugaskan menuju lokasi, SLA 1-2 Jam diaktifkan.' },
      { headers: { Cookie: adminCookie } }
    );
    const pass5_2 = res5_2.status === 200 && res5_2.data.success;
    recordTest('SKENARIO 5', '5.2 Verifikasi Triage Darurat (Action: verify -> Diproses)', pass5_2, `Respon: ${res5_2.data.message}`);

    // Verifikasi perubahan status tiket darurat setelah triage
    const checkUrgentAfterTriage = await anonClient.get(`/reports/${ticketUrgent}`);
    const passCheckUrgent = checkUrgentAfterTriage.data.report?.status === 'Diproses';
    recordTest('SKENARIO 5', '5.2b Verifikasi Status Tiket Pasca-Triage', passCheckUrgent, `Status Tiket: ${checkUrgentAfterTriage.data.report?.status}`);

    // 5.3 Eksekusi AI Batch Clustering (POST /api/admin/batch-ai)
    const res5_3 = await anonClient.post('/admin/batch-ai', {}, { headers: { Cookie: adminCookie } });
    const pass5_3 = res5_3.status === 200 && res5_3.data.success;
    recordTest('SKENARIO 5', '5.3 Pemicu AI Batch Clustering & Severity Scoring', pass5_3, `Kluster Terproses: ${res5_3.data.results?.count ?? 'OK'}`);

    // Cek apakah laporan 1 dan 2 berhasil dikelompokkan
    const checkCluster = await anonClient.get(`/reports/${ticketNormal2}`);
    const parentId = checkCluster.data.report?.parent_report_id;
    const passClusterLink = parentId === reportIdNormal1;
    recordTest('SKENARIO 5', '5.4 Keterhubungan Kluster (Parent-Child Cluster)', passClusterLink, `Parent Report ID: ${parentId} (Sesuai #${ticketNormal1})`);

    // 5.5 Perubahan Status & Sinkronisasi Kaskade (Cascade Update ke Anak Kluster)
    const res5_5 = await anonClient.post(
      `/admin/reports/${reportIdNormal1}/status`,
      { status: 'Diproses', keterangan: 'Teknisi pendingin sedang mengganti pipa pembuangan AC.' },
      { headers: { Cookie: adminCookie } }
    );
    const pass5_5 = res5_5.status === 200 && res5_5.data.success;
    recordTest('SKENARIO 5', '5.5 Update Status Tiket Induk & Sinkronisasi Kaskade', pass5_5, `Respon: ${res5_5.data.message}`);

    // Verifikasi tiket anak ikut berubah status menjadi 'Diproses'
    const checkChildCascade = await anonClient.get(`/reports/${ticketNormal2}`);
    const passCascadeSuccess = checkChildCascade.data.report?.status === 'Diproses';
    recordTest('SKENARIO 5', '5.5b Verifikasi Status Tiket Anak Ter-update Otomatis', passCascadeSuccess, `Status Anak: ${checkChildCascade.data.report?.status}`);

    // 5.6 Unlink Kluster: Memisahkan Laporan dari Induk (Unlink False Positive)
    const childReportId = checkCluster.data.report?.report_id;
    const res5_6 = await anonClient.post(
      `/admin/reports/${childReportId}/unlink`,
      {},
      { headers: { Cookie: adminCookie } }
    );
    const pass5_6 = res5_6.status === 200 && res5_6.data.success;
    recordTest('SKENARIO 5', '5.6 Unlink Kluster (Pemisahan Tiket dari Induk)', pass5_6, `Respon: ${res5_6.data.message}`);

    // Verifikasi parent_report_id anak menjadi null
    const checkChildUnlinked = await anonClient.get(`/reports/${ticketNormal2}`);
    const passUnlinkedSuccess = checkChildUnlinked.data.report?.parent_report_id === null;
    recordTest('SKENARIO 5', '5.6b Verifikasi Tiket Berdiri Sendiri Pasca-Unlink', passUnlinkedSuccess, `Parent ID: ${checkChildUnlinked.data.report?.parent_report_id}`);

    // 5.7 Update Status Akhir Menjadi 'Selesai'
    const res5_7 = await anonClient.post(
      `/admin/reports/${reportIdNormal1}/status`,
      { status: 'Selesai', keterangan: 'Perbaikan tuntas dan diuji bekerja dengan normal.' },
      { headers: { Cookie: adminCookie } }
    );
    const pass5_7 = res5_7.status === 200 && res5_7.data.success;
    recordTest('SKENARIO 5', '5.7 Penyelesaian Akhir Tiket (Status -> Selesai)', pass5_7, `Respon: ${res5_7.data.message}`);

    // Verifikasi Stepper Linimasa Mencapai Langkah 4 (Selesai)
    const checkCompletedTimeline = await anonClient.get(`/reports/${ticketNormal1}`);
    const passTimelineCompleted = checkCompletedTimeline.data.stepIndex === 4 && checkCompletedTimeline.data.report?.status === 'Selesai';
    recordTest('SKENARIO 5', '5.7b Verifikasi Stepper Linimasa Selesai (Step 4/4)', passTimelineCompleted, `Step: ${checkCompletedTimeline.data.stepIndex}/4`);


    // =========================================================================
    // SKENARIO 6: STATIC ASSETS & WEB FRONTEND SERVING
    // =========================================================================
    console.log('\n--- 🌐 SKENARIO 6: FRONTEND WEB SERVING & STATIC ASSETS ---');

    // 6.1 Serving Web Root (Single Page Application index.html)
    const res6_1 = await axios.get(BASE_URL);
    const pass6_1 = res6_1.status === 200 && res6_1.data.includes('<div id="root">') && res6_1.data.includes('LaporSarpras');
    recordTest('SKENARIO 6', '6.1 Serving Web Root SPA (index.html)', pass6_1, `Status: ${res6_1.status} OK`);

    // 6.2 Serving Static Assets Bundle
    const matchScript = res6_1.data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    let pass6_2 = false;
    if (matchScript && matchScript[1]) {
      const res6_2 = await axios.get(`${BASE_URL}${matchScript[1]}`);
      pass6_2 = res6_2.status === 200 && res6_2.headers['content-type']?.includes('javascript');
    }
    recordTest('SKENARIO 6', '6.2 Serving React JS Production Bundle', pass6_2, `Bundle: ${matchScript ? matchScript[1] : 'Not Found'}`);

    // 6.3 Serving Static CSS Bundle
    const matchCss = res6_1.data.match(/href="(\/assets\/index-[^"]+\.css)"/);
    let pass6_3 = false;
    if (matchCss && matchCss[1]) {
      const res6_3 = await axios.get(`${BASE_URL}${matchCss[1]}`);
      pass6_3 = res6_3.status === 200 && res6_3.headers['content-type']?.includes('css');
    }
    recordTest('SKENARIO 6', '6.3 Serving Tailwind CSS Production Bundle', pass6_3, `CSS: ${matchCss ? matchCss[1] : 'Not Found'}`);

    // =========================================================================
    // RINGKASAN HASIL PENGUJIAN
    // =========================================================================
    console.log('\n================================================================');
    console.log('📊 REKAPITULASI HASIL PENGUJIAN SKENARIO SISTEM');
    console.log('================================================================');
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = results.filter((r) => !r.passed).length;

    console.log(`Total Skenario Diuji : ${totalTests}`);
    console.log(`Lolos Pengujian (PASS) : ${passedTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log(`Gagal Pengujian (FAIL) : ${failedTests}`);

    if (failedTests === 0) {
      console.log('\n🎉 SEMUA SKENARIO WEB (100%) DINYATAKAN LULUS DAN BERFUNGSI SEMPURNA!');
    } else {
      console.log(`\n⚠️ Teridentifikasi ${failedTests} pengujian yang gagal.`);
    }
    console.log('================================================================\n');
  } catch (error) {
    console.error('Unhandled Testing Exception:', error);
  } finally {
    serverProcess.kill('SIGTERM');
  }
}

runAllTests();
