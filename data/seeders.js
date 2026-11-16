import {
  sequelize,
  User,
  Report,
  EmergencyVerification,
  ReportStatusLog,
} from '../models/index.js';

export const runSeeder = async () => {
  console.log('====================================================');
  console.log('🌱 MEMULAI DATA SEEDER PENGGUNA - LAPORSARPRAS AI');
  console.log('====================================================');

  try {
    // 1. Pastikan koneksi DB aktif
    await sequelize.authenticate();
    console.log('✅ Koneksi PostgreSQL terhubung.');

    // 2. DATA PENGGUNA (USERS)
    const usersData = [
      {
        nim: '20240140151',
        nama_lengkap: 'Muhammad Rasyid Ridha Aqimuddin',
        email: 'rasyid.aqim@mail.umy.ac.id',
        password_hash: 'password123',
        role: 'mahasiswa',
      },
      {
        nim: '20240140137',
        nama_lengkap: 'Yogi Aulia Ardiano',
        email: 'yogi.aulia@mail.umy.ac.id',
        password_hash: 'password123',
        role: 'mahasiswa',
      },
      {
        nim: '20240140013',
        nama_lengkap: 'Firmansyah',
        email: 'firmansyah@mail.umy.ac.id',
        password_hash: 'password123',
        role: 'mahasiswa',
      },
      {
        nim: 'admin_sarpras',
        nama_lengkap: 'Staf Operasional Biro Sarpras UMY',
        email: 'sarpras@umy.ac.id',
        password_hash: 'password123',
        role: 'admin',
      },
    ];

    console.log('👤 Menanam data akun pengguna (Users)...');
    const createdUsers = await User.bulkCreate(usersData, {
      ignoreDuplicates: true,
      returning: true,
    });
    console.log(`   Berhasil menanam ${createdUsers.length} pengguna.`);
    console.log('ℹ️ Tabel laporan (Reports) dibiarkan bersih / kosong untuk data aktual pengaduan.');

    console.log('====================================================');
    console.log('🎉 SEEDER PENGGUNA SELESAI!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Gagal menjalankan seeder:', error);
  }
};

// Eksekusi otomatis jika dipanggil langsung via CLI
if (process.argv[1].endsWith('seeders.js')) {
  runSeeder().then(() => process.exit(0));
}
