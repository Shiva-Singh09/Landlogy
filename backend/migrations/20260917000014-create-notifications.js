'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable('notifications', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      recipient_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      related_entity_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      related_entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, { transaction });

    await queryInterface.addIndex('notifications', {
      fields: ['recipient_user_id', 'created_at'],
      name: 'idx_notifications_recipient_created',
      transaction,
    });
    await queryInterface.addIndex('notifications', {
      fields: ['recipient_user_id', 'is_read'],
      name: 'idx_notifications_recipient_read',
      transaction,
    });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('notifications', { transaction });
  },
};
