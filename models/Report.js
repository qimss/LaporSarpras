import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Report extends Model {}

Report.init(
  {
    report_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ticket_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      comment: 'Format: TKT-YYYYMMDD-XXXX untuk pelacakan mahasiswa',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK to USERS.user_id (pelapor)',
    },
    nama_fasilitas: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Benda/fasilitas yang rusak (misal: AC, Kursi, Lampu, Proyektor, Toilet)',
    },
    parent_report_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Self-referencing FK ke Report Induk (Clustering)',
    },
    kode_lokasi: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Kode ruangan dari QR Code (misal: F6-L2-204)',
    },
    deskripsi_kerusakan: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    foto_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Path berkas foto bukti fisik wajib',
    },
    is_urgent_claimed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Apakah pelapor menandai kondisi darurat/mendesak',
    },
    status: {
      type: DataTypes.ENUM(
        'Menunggu Analisis AI',
        'Dugaan Mendesak',
        'Diterima',
        'Diproses',
        'Selesai',
        'Ditolak'
      ),
      allowNull: false,
      defaultValue: 'Menunggu Analisis AI',
    },
  },
  {
    sequelize,
    modelName: 'Report',
    tableName: 'reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Report;
