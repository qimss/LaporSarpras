import axios from 'axios';

async function testFullFlow() {
  const mahasiswaClient = axios.create({
    baseURL: 'http://localhost:3000/api',
  });

  const adminClient = axios.create({
    baseURL: 'http://localhost:3000/api',
  });

  try {
    // 1. Login Mahasiswa
    const loginMhs = await mahasiswaClient.post('/auth/login', {
      nim: '20240140151',
      password: 'password123',
    });
    console.log('1. Mahasiswa logged in:', loginMhs.data.user.nama_lengkap);
    const mhsCookie = loginMhs.headers['set-cookie']?.[0];

    // 2. Mahasiswa kirim laporan
    const reportRes = await mahasiswaClient.post('/reports', {
      kode_lokasi: 'Gedung F6 L2 R.204',
      nama_fasilitas: 'Pendingin Ruangan (AC)',
      deskripsi_kerusakan: 'AC bocor air menetes ke meja kuliah dan tidak dingin',
      is_urgent_claimed: false,
    }, {
      headers: { Cookie: mhsCookie },
    });
    console.log('2. Laporan dibuat:', reportRes.data.report.ticket_number);
    const ticket = reportRes.data.report.ticket_number;

    // 3. Cek tracking laporan
    const trackRes = await mahasiswaClient.get(`/reports/${ticket}`);
    console.log('3. Tracking step:', trackRes.data.stepIndex, 'Status:', trackRes.data.report.status);

    // 4. Login Admin
    const loginAdm = await adminClient.post('/auth/login', {
      nim: 'admin_sarpras',
      password: 'password123',
    });
    console.log('4. Admin logged in:', loginAdm.data.user.nama_lengkap);
    const admCookie = loginAdm.headers['set-cookie']?.[0];

    // 5. Admin Dashboard
    const dashRes = await adminClient.get('/admin/dashboard', {
      headers: { Cookie: admCookie },
    });
    console.log('5. Admin Dashboard KPIs:', dashRes.data.kpis);
    console.log('Total pengaduan di dashboard:', dashRes.data.allReports.length);

    console.log('🎉 FULL INTEGRATION VERIFICATION SUCCESSFUL!');
  } catch (err) {
    console.error('Integration Test Error:', err.response?.data || err.message);
  }
}

testFullFlow();
