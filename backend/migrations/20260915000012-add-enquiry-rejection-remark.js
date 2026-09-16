export default {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.addColumn('enquiries', 'rejection_remark', {
      type: Sequelize.TEXT,
      allowNull: true,
    }, transaction ? { transaction } : undefined);
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.removeColumn('enquiries', 'rejection_remark', transaction ? { transaction } : undefined);
  },
};
