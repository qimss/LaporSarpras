import sequelize from '../config/database.js';
import User from './User.js';
import Report from './Report.js';
import EmergencyVerification from './EmergencyVerification.js';
import AIAnalysisResult from './AIAnalysisResult.js';
import ReportStatusLog from './ReportStatusLog.js';

// ==========================================
// DEFINISI ASOSIASI RELASI (5 ENTITAS)
// ==========================================

// 1. Relasi USERS (1 : N) REPORTS
User.hasMany(Report, {
  foreignKey: 'user_id',
  as: 'reports',
  onDelete: 'RESTRICT',
});
Report.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'reporter',
});

// 2. Relasi SELF-REFERENCING REPORTS (1 : N) REPORTS (Clustering)
// Satu Laporan Utama (Parent) menaungi banyak Laporan Serupa (Children)
Report.belongsTo(Report, {
  foreignKey: 'parent_report_id',
  as: 'parentReport',
  onDelete: 'SET NULL',
});
Report.hasMany(Report, {
  foreignKey: 'parent_report_id',
  as: 'similarReports',
  onDelete: 'SET NULL',
});

// 3. Relasi REPORTS (1 : 1) EMERGENCY_VERIFICATIONS
Report.hasOne(EmergencyVerification, {
  foreignKey: 'report_id',
  as: 'emergencyVerification',
  onDelete: 'CASCADE',
});
EmergencyVerification.belongsTo(Report, {
  foreignKey: 'report_id',
  as: 'report',
});
EmergencyVerification.belongsTo(User, {
  foreignKey: 'admin_id',
  as: 'verifier',
});

// 4. Relasi REPORTS (1 : 1) AI_ANALYSIS_RESULTS
Report.hasOne(AIAnalysisResult, {
  foreignKey: 'report_id',
  as: 'aiAnalysis',
  onDelete: 'CASCADE',
});
AIAnalysisResult.belongsTo(Report, {
  foreignKey: 'report_id',
  as: 'report',
});

// 5. Relasi REPORTS (1 : N) REPORT_STATUS_LOGS
Report.hasMany(ReportStatusLog, {
  foreignKey: 'report_id',
  as: 'statusLogs',
  onDelete: 'CASCADE',
});
ReportStatusLog.belongsTo(Report, {
  foreignKey: 'report_id',
  as: 'report',
});
ReportStatusLog.belongsTo(User, {
  foreignKey: 'updated_by_user_id',
  as: 'updatedBy',
});

export {
  sequelize,
  User,
  Report,
  EmergencyVerification,
  AIAnalysisResult,
  ReportStatusLog,
};

export default {
  sequelize,
  User,
  Report,
  EmergencyVerification,
  AIAnalysisResult,
  ReportStatusLog,
};
