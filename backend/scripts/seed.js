import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import db from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEEDERS_DIR = path.join(__dirname, '..', 'seeders');
const META_TABLE = 'sequelize_seed_meta';

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

async function getExecutedSeeders() {
  await ensureMetaTable();
  const [results] = await db.sequelize.query(
    `SELECT name FROM ${META_TABLE} ORDER BY name ASC`
  );
  return results.map((r) => r.name);
}

async function runSeeders() {
  await ensureMetaTable();
  const executed = await getExecutedSeeders();
  const files = fs
    .readdirSync(SEEDERS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (executed.includes(file)) {
      console.log(`[seeder] Already executed: ${file}`);
      continue;
    }
    const mod = await import(pathToFileURL(path.join(SEEDERS_DIR, file)).href);
    const s = mod.default || mod;
    if (!s.up) continue;

    console.log(`[seeder] Running: ${file}`);
    const transaction = await db.sequelize.transaction();
    try {
      await s.up({ context: db.sequelize.getQueryInterface() });
      await db.sequelize.query(
        `INSERT INTO ${META_TABLE} (name) VALUES (:name)`,
        { replacements: { name: file }, transaction }
      );
      await transaction.commit();
      count++;
    } catch (err) {
      await transaction.rollback();
      console.error(`[seeder] FAILED: ${file}`);
      throw err;
    }
  }

  if (count === 0) {
    console.log('[seeder] No pending seeders.');
  } else {
    console.log(`[seeder] ${count} seeder(s) applied.`);
  }
}

async function undoLast() {
  await ensureMetaTable();
  const [results] = await db.sequelize.query(
    `SELECT name FROM ${META_TABLE} ORDER BY name DESC LIMIT 1`
  );
  if (results.length === 0) {
    console.log('[seeder] No seeders to undo.');
    return;
  }

  const lastFile = results[0].name;
  const mod = await import(pathToFileURL(path.join(SEEDERS_DIR, lastFile)).href);
  const s = mod.default || mod;

  if (!s.down) {
    console.log(`[seeder] ${lastFile} has no down() — skipping.`);
    return;
  }

  console.log(`[seeder] Undoing: ${lastFile}`);
  const transaction = await db.sequelize.transaction();
  try {
    await s.down({ context: db.sequelize.getQueryInterface() });
    await db.sequelize.query(
      `DELETE FROM ${META_TABLE} WHERE name = :name`,
      { replacements: { name: lastFile }, transaction }
    );
    await transaction.commit();
    console.log(`[seeder] Undone: ${lastFile}`);
  } catch (err) {
    await transaction.rollback();
    console.error(`[seeder] Undo FAILED: ${lastFile}`);
    throw err;
  }
}

// CLI
const action = process.argv[2];
if (action === 'undo') {
  undoLast().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
} else {
  runSeeders().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
