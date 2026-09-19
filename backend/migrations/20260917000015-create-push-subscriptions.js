export default {
  async up(q, S, transaction) {
    await q.createTable('push_subscriptions', {
      id: { type: S.UUID, defaultValue: S.UUIDV4, primaryKey: true, allowNull: false },
      user_id: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      endpoint: { type: S.TEXT, allowNull: false },
      endpoint_hash: { type: S.STRING(64), allowNull: false, unique: true },
      p256dh: { type: S.STRING(100), allowNull: false },
      auth: { type: S.STRING(30), allowNull: false },
      silent: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: S.DATE, allowNull: false },
      updated_at: { type: S.DATE, allowNull: false },
    }, { transaction });
    await q.addIndex('push_subscriptions', ['user_id'], { transaction });
  },
  async down(q, S, transaction) { await q.dropTable('push_subscriptions', { transaction }); },
};
