import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.createTable('password_reset_otps', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      otp_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      attempts_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_sent_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      consumed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    }, opts);

    await queryInterface.addIndex('password_reset_otps', ['email'], {
      name: 'password_reset_otps_email_idx',
      ...(opts || {}),
    });
    await queryInterface.addIndex('password_reset_otps', ['user_id'], {
      name: 'password_reset_otps_user_id_idx',
      ...(opts || {}),
    });
    await queryInterface.addIndex('password_reset_otps', ['expires_at'], {
      name: 'password_reset_otps_expires_at_idx',
      ...(opts || {}),
    });
    await queryInterface.addIndex('password_reset_otps', ['consumed_at'], {
      name: 'password_reset_otps_consumed_at_idx',
      ...(opts || {}),
    });
    await queryInterface.addIndex('password_reset_otps', ['email', 'consumed_at', 'expires_at'], {
      name: 'password_reset_otps_lookup_idx',
      ...(opts || {}),
    });
  },

  async down(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.dropTable('password_reset_otps', opts);
  },
};
