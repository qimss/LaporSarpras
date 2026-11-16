import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASSWORD;
const dbDialect = process.env.DB_DIALECT;

export const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: Number(dbPort),
  dialect: dbDialect,
  logging: false, // ubah ke console.log jika ingin melihat raw query
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Koneksi basis data PostgreSQL/Sequelize berhasil terhubung.');
    return true;
  } catch (error) {
    console.warn('⚠️ Gagal terhubung ke database:', error.message);
    return false;
  }
};

export default sequelize;
