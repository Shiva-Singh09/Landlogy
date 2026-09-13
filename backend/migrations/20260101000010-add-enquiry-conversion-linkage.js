import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    // enquiry -> provisioned seller account (idempotency + ownership linkage)
    await queryInterface.addColumn('enquiries', 'converted_user_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }, opts);
    // enquiry -> initial seller-owned property (duplicate protection)
    await queryInterface.addColumn('enquiries', 'converted_property_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'properties', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }, opts);
    await queryInterface.addIndex('enquiries', ['converted_user_id'], {
      name: 'enquiries_converted_user_id_idx',
      ...opts,
    });
    await queryInterface.addIndex('enquiries', ['converted_property_id'], {
      name: 'enquiries_converted_property_id_idx',
      ...opts,
    });
  },

  async down(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    try { await queryInterface.removeIndex('enquiries', 'enquiries_converted_user_id_idx', opts); } catch {}
    try { await queryInterface.removeIndex('enquiries', 'enquiries_converted_property_id_idx', opts); } catch {}
    try { await queryInterface.removeColumn('enquiries', 'converted_property_id', opts); } catch {}
    try { await queryInterface.removeColumn('enquiries', 'converted_user_id', opts); } catch {}
  },
};
