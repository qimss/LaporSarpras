import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class EmergencyVerification extends Model {}

EmergencyVerification.init(
  {
    verification_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'FK to REPORTS.report_id (1:1)',
    },
    skor_risiko_keselamatan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Skor hasil evaluasi kuesioner risiko (0-100)',
    },
    durasi_masalah: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '< 1 jam, 1-24 jam, > 1 hari',
    },
    status_verifikasi: {
      type: DataTypes.ENUM('Pending', 'Terkonfirmasi Darurat', 'Diturunkan ke Biasa'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK to USERS.user_id (Admin verifikator)',
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'EmergencyVerification',
    tableName: 'emergency_verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default EmergencyVerification;
