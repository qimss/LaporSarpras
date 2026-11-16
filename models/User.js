import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class User extends Model {}

User.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nim: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      comment: 'NIM Mahasiswa atau NIP Staff Sarpras',
    },
    nama_lengkap: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('mahasiswa', 'admin'),
      allowNull: false,
      defaultValue: 'mahasiswa',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default User;
