import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class AIAnalysisResult extends Model {}

AIAnalysisResult.init(
  {
    analysis_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'FK to REPORTS.report_id (1:1 untuk laporan induk/master)',
    },
    rekomendasi_prioritas: {
      type: DataTypes.ENUM('Tinggi', 'Sedang', 'Rendah'),
      allowNull: false,
      comment: 'Tinggi, Sedang, Rendah sesuai Matriks Bab 6.2',
    },
    skor_keyakinan: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.9,
      comment: 'Confidence score (0.0 - 1.0)',
    },
    kata_kunci_utama: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array kata kunci pemicu',
    },
    alasan_ringkas: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Justifikasi 1-2 kalimat dari AI',
    },
    rekomendasi_tindakan: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Saran teknis untuk teknisi Sarpras',
    },
    jumlah_laporan_serupa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Total akumulasi laporan dalam kluster ini',
    },
  },
  {
    sequelize,
    modelName: 'AIAnalysisResult',
    tableName: 'ai_analysis_results',
    timestamps: true,
    createdAt: 'processed_at',
    updatedAt: false,
  }
);

export default AIAnalysisResult;
