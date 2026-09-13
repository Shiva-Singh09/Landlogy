import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_tokens', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      otp_code_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      purpose: {
        type: DataTypes.ENUM('login', 'password_reset', 'email_verification', 'phone_verification'),
        allowNull: false,
      },
      is_used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      used_at: {
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
    });

    await queryInterface.addIndex('otp_tokens', ['user_id'], { name: 'otp_tokens_user_id_idx' });
    await queryInterface.addIndex('otp_tokens', ['purpose'], { name: 'otp_tokens_purpose_idx' });
    await queryInterface.addIndex('otp_tokens', ['is_used'], { name: 'otp_tokens_is_used_idx' });
    await queryInterface.addIndex('otp_tokens', ['expires_at'], { name: 'otp_tokens_expires_at_idx' });
    await queryInterface.addIndex('otp_tokens', ['user_id', 'purpose', 'is_used'], { name: 'otp_tokens_user_id_purpose_is_used_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('otp_tokens');
  },
};
