import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let sequelizeInstance;

if (databaseUrl) {
  // Mode Cloud Database (Render, Railway, Supabase, Neon, Aiven, Heroku)
  const isCloudHost = !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1');
  sequelizeInstance = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: isCloudHost
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  // Mode Standar / Variabel Lingkungan Lokal
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const dbName = process.env.DB_NAME || 'laporsarpras_db';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbDialect = process.env.DB_DIALECT || 'postgres';

  const isRemoteHost = dbHost !== 'localhost' && dbHost !== '127.0.0.1';

  sequelizeInstance = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    port: Number(dbPort),
    dialect: dbDialect,
    logging: false,
    dialectOptions: (isProduction || isRemoteHost)
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

export const sequelize = sequelizeInstance;

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
