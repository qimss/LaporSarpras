export interface User {
  user_id: number;
  nim: string;
  nama_lengkap: string;
  email: string;
  role: 'mahasiswa' | 'admin';
}

export interface ReportStatusLog {
  log_id: number;
  report_id: number;
  status: string;
  keterangan: string;
  created_at: string;
}

export interface EmergencyVerification {
  verification_id: number;
  report_id: number;
  jenis_bahaya: string;
  durasi_masalah: string;
  status_verifikasi: 'Pending' | 'Verified' | 'Downgraded';
  catatan_petugas?: string;
  waktu_verifikasi?: string;
}

export interface AIAnalysisResult {
  analysis_id: number;
  report_id: number;
  rekomendasi_prioritas: string;
  skor_keyakinan: number;
  kata_kunci_utama: string;
  alasan_ringkas: string;
  rekomendasi_tindakan: string;
  jumlah_laporan_serupa: number;
}

export interface Report {
  report_id: number;
  ticket_number: string;
  user_id: number;
  parent_report_id?: number | null;
  kode_lokasi: string;
  nama_fasilitas: string;
  deskripsi_kerusakan: string;
  foto_url: string;
  is_urgent_claimed: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  User?: {
    nama_lengkap: string;
    nim: string;
  };
  EmergencyVerification?: EmergencyVerification;
  AIAnalysisResult?: AIAnalysisResult;
  ParentReport?: {
    ticket_number: string;
    nama_fasilitas: string;
  };
  ChildReports?: Report[];
  StatusLogs?: ReportStatusLog[];
}

export interface KPIs {
  total: number;
  urgent: number;
  inProgress: number;
  completed: number;
}
