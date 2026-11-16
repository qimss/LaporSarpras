import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class ReportStatusLog extends Model {}

ReportStatusLog.init(
  {
    log_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK to REPORTS.report_id',
    },
    status_sebelum: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status_sesudah: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    catatan_petugas: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Catatan transparansi dari admin',
    },
    updated_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK to USERS.user_id (Aktor pengubah status)',
    },
  },
  {
    sequelize,
    modelName: 'ReportStatusLog',
    tableName: 'report_status_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default ReportStatusLog;
