import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import db from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const META_TABLE = 'sequelize_meta';

async function ensureMetaTable() {
  const qi = db.sequelize.getQueryInterface();
  const tables = await qi.showAllTables();
  if (!tables.includes(META_TABLE)) {
    await qi.createTable(META_TABLE, {
      name: {
        type: db.Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },
    });
  }
}

async function getExecutedMigrations() {
  await ensureMetaTable();
  const [results] = await db.sequelize.query(
    `SELECT name FROM ${META_TABLE} ORDER BY name ASC`
  );
  return results.map((r) => r.name);
}

async function runMigrations() {
  await ensureMetaTable();
  const executed = await getExecutedMigrations();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (executed.includes(file)) continue;
    const migration = await import(pathToFileURL(path.join(MIGRATIONS_DIR, file)).href);
    const m = migration.default || migration;
    if (!m.up) continue;

    console.log(`[migration] Running: ${file}`);
    const transaction = await db.sequelize.transaction();
    try {
      await m.up(db.sequelize.getQueryInterface(), db.Sequelize, transaction);
      await db.sequelize.query(
        `INSERT INTO ${META_TABLE} (name) VALUES (:name)`,
        { replacements: { name: file }, transaction }
      );
      await transaction.commit();
      count++;
    } catch (err) {
      await transaction.rollback();
      console.error(`[migration] FAILED: ${file}`);
      throw err;
    }
  }

  if (count === 0) {
    console.log('[migration] No pending migrations.');
  } else {
    console.log(`[migration] ${count} migration(s) applied.`);
  }
}

async function rollbackLast() {
  await ensureMetaTable();
  const [results] = await db.sequelize.query(
    `SELECT name FROM ${META_TABLE} ORDER BY name DESC LIMIT 1`
  );
  if (results.length === 0) {
    console.log('[migration] No migrations to rollback.');
    return;
  }

  const lastFile = results[0].name;
  const migration = await import(pathToFileURL(path.join(MIGRATIONS_DIR, lastFile)).href);
  const m = migration.default || migration;

  if (!m.down) {
    console.log(`[migration] ${lastFile} has no down() — skipping.`);
    return;
  }

  console.log(`[migration] Rolling back: ${lastFile}`);
  const transaction = await db.sequelize.transaction();
  try {
    await m.down(db.sequelize.getQueryInterface(), db.Sequelize, transaction);
    await db.sequelize.query(
      `DELETE FROM ${META_TABLE} WHERE name = :name`,
      { replacements: { name: lastFile }, transaction }
    );
    await transaction.commit();
    console.log(`[migration] Rolled back: ${lastFile}`);
  } catch (err) {
    await transaction.rollback();
    console.error(`[migration] Rollback FAILED: ${lastFile}`);
    throw err;
  }
}

// CLI
const action = process.argv[2];
if (action === 'rollback') {
  rollbackLast().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
} else {
  runMigrations().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
