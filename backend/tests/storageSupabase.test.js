// Task 4 — Supabase Storage for property images (mocked; never touches the
// real Supabase project or any real secret). Covers: driver gating, object
// path convention, client upload in both modes (mocked at the db singleton,
// per the existing node:test convention), orphan cleanup on DB failure, admin
// upload/delete behaviour, and preserved validation/ownership semantics.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';
// Fake project coordinates so the URL classifier has something to match
// against. NEVER a real secret — the storage client is never constructed in
// local-driver mode.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://proj.supabase.co';
process.env.SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'property-images';

// ── Pure helper tests (no Supabase client needed in local mode) ─────────────
const storageMod = await import('../config/storage.js');
const storage = storageMod.storage;
const { buildObjectPath, isLegacyUploadURL, isSupabaseStorageURL, objectPathFromURL } = storage;

test('object path convention is properties/{propertyId}/{randomHex}.{ext}', () => {
  assert.equal(
    buildObjectPath('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'abc123.png'),
    'properties/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/abc123.png'
  );
});

test('legacy /uploads/... URLs are classified as legacy, not supabase', () => {
  assert.equal(isLegacyUploadURL('/uploads/5b6f4734d6865b5039c45d4f2fc46700.png'), true);
  assert.equal(isSupabaseStorageURL('/uploads/5b6f4734d6865b5039c45d4f2fc46700.png'), false);
  assert.equal(objectPathFromURL('/uploads/5b6f4734d6865b5039c45d4f2fc46700.png'), null);
});

test('generateImageFilename maps known and unknown mimetypes deterministically', async () => {
  const { generateImageFilename } = await import('../config/upload.js');
  assert.match(generateImageFilename('image/png'), /^[0-9a-f]{32}\.png$/);
  assert.match(generateImageFilename('image/jpeg'), /^[0-9a-f]{32}\.jpg$/);
  assert.match(generateImageFilename('image/webp'), /^[0-9a-f]{32}\.webp$/);
  // Unknown mimetype → fallback extension (multer fileFilter blocks such files anyway)
  assert.match(generateImageFilename('image/gif'), /^[0-9a-f]{32}\.jpg$/);
});

test('local driver is active without supabase config and removal is a safe no-op', async () => {
  assert.equal(storage.driver, 'local');
  assert.equal(await storage.removeObjectPath('properties/x/y.png'), false);
  assert.equal(await storage.removePropertyImage('/uploads/legacy.png'), false);
});

test('supabase URL classifier rejects foreign origins, other buckets and non-URLs', () => {
  assert.equal(isSupabaseStorageURL('https://evil.example.com/storage/v1/object/public/property-images/properties/x.png'), false);
  assert.equal(isSupabaseStorageURL('https://proj.supabase.co/storage/v1/object/public/other-bucket/properties/x.png'), false);
  assert.equal(isSupabaseStorageURL('not a url'), false);
  assert.equal(isSupabaseStorageURL(null), false);
});

// ── Controller-level tests: client uploadImages (local + supabase branches) ─
const db = (await import('../models/index.js')).default;
const { uploadImages } = await import('../controllers/client/clientController.js');

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const fileObj = (filename) => ({ filename, path: path.join(os.tmpdir(), filename), mimetype: 'image/png' });

const response = () => {
  let code = 200; // Express defaults to 200 when res.status() is never called
  return {
    get statusCode() { return code; },
    status(c) { code = c; return this; },
    body: null,
    json(payload) { this.body = payload; return this; },
  };
};

const makeReq = (files, body = {}, params = { id: UUID }) => ({ files, body, params, user: { id: 'seller-1' } });

test('client uploadImages in local mode keeps legacy /uploads/ URL and response shape', async () => {
  const f = fileObj('local-test-1.png');
  const findMock = mock.method(db.Property, 'findOne', async () => ({ id: UUID })); // ownership lookup — never hit the real DB
  const maxMock = mock.method(db.PropertyImage, 'max', async () => 0);
  const updMock = mock.method(db.PropertyImage, 'update', async () => [1]);
  const createMock = mock.method(db.PropertyImage, 'create', async (data) => ({ ...data, id: 'img-1', created_at: new Date() }));
  try {
    fs.writeFileSync(f.path, 'x'); // local cleanup path expects a real file
    const res = response();
    await uploadImages(makeReq([f], { is_primary: 'true' }), res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.ok, true);
    assert.match(res.body.images[0].url, /^\/uploads\/local-test-1\.png$/);
    assert.equal(res.body.images[0].is_primary, true);
    assert.equal(createMock.mock.calls[0].arguments[0].sort_order, 1);
    assert.equal(fs.existsSync(f.path), true); // persisted, not cleaned up
  } finally {
    findMock.mock.restore(); maxMock.mock.restore(); updMock.mock.restore(); createMock.mock.restore();
    try { fs.unlinkSync(f.path); } catch {}
  }
});

test('client uploadImages local mode: DB failure cleans up stray temp files', async () => {
  const f = fileObj('local-test-2.png');
  const findMock = mock.method(db.Property, 'findOne', async () => ({ id: UUID }));
  const maxMock = mock.method(db.PropertyImage, 'max', async () => 0);
  const createMock = mock.method(db.PropertyImage, 'create', async () => { throw new Error('boom'); });
  try {
    fs.writeFileSync(f.path, 'x');
    const res = response();
    await uploadImages(makeReq([f]), res);
    assert.equal(res.statusCode, 502);
    assert.equal(fs.existsSync(f.path), false); // cleanupUploadedFiles removed it
  } finally {
    findMock.mock.restore(); maxMock.mock.restore(); createMock.mock.restore();
    try { fs.unlinkSync(f.path); } catch {}
  }
});

test('client uploadImages supabase mode: public HTTPS URL stored, cleanup on DB failure', async () => {
  const PUBLIC = 'https://proj.supabase.co/storage/v1/object/public/property-images/properties/' + UUID + '/a.png';
  const calls = { upload: 0, paths: [], remove: [], url: null };
  const upMock = mock.method(storage, 'uploadPropertyImage', async ({ propertyId, filename }) => {
    calls.upload += 1;
    assert.equal(propertyId, UUID);
    assert.match(filename, /^[0-9a-f]{32}\.png$/);
    const objectPath = `properties/${propertyId}/${filename}`;
    calls.paths.push(objectPath);
    calls.url = `https://proj.supabase.co/storage/v1/object/public/property-images/${objectPath}`;
    return { objectPath, publicUrl: calls.url };
  });
  const rmMock = mock.method(storage, 'removeObjectPath', async (p) => { calls.remove.push(p); return true; });
  const savedDriver = storage.driver; storage.driver = 'supabase'; // force supabase branch
  const findMock = mock.method(db.Property, 'findOne', async () => ({ id: UUID }));
  const maxMock = mock.method(db.PropertyImage, 'max', async () => 0);
  const updMock = mock.method(db.PropertyImage, 'update', async () => [1]);
  let failCreate = true;
  const createMock = mock.method(db.PropertyImage, 'create', async (data) => {
    if (failCreate) throw new Error('db down');
    assert.equal(data.url, calls.url); // public HTTPS URL goes straight into property_images.url
    return { ...data, id: 'img-2', created_at: new Date() };
  });
  try {
    const res = response();
    await uploadImages(makeReq([fileObj('ignored-in-memory.png')]), res);
    assert.equal(res.statusCode, 502); // DB failure reported
    assert.equal(calls.upload, 1);
    assert.equal(calls.remove.length, 1); // orphan object cleaned up after DB failure
    assert.equal(calls.remove[0], calls.paths[0]); // exactly the failed object, correct path
    assert.match(calls.remove[0], /^properties\/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\/[0-9a-f]{32}\.png$/);

    failCreate = false; // happy path
    calls.upload = 0; calls.remove.length = 0;
    const res2 = response();
    await uploadImages(makeReq([fileObj('ignored-in-memory.png')], { is_primary: 'true' }), res2);
    assert.equal(res2.statusCode, 201);
    assert.equal(res2.body.ok, true);
    assert.equal(res2.body.images[0].url, calls.url);
    assert.match(res2.body.images[0].url, /^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/property-images\/properties\//);
    assert.equal(res2.body.images[0].is_primary, true); // cover semantics preserved
    assert.equal(calls.remove.length, 0); // no cleanup on success
    assert.equal(updMock.mock.calls.length, 1); // single-primary clearing still ran
  } finally {
    for (const m of [upMock, rmMock, findMock, maxMock, updMock, createMock]) m.mock.restore();
    storage.driver = savedDriver;
  }
});

test('admin uploadImage supabase mode stores public URL; admin delete branches by URL type', async () => {
  const { uploadImage, deleteImage } = await import('../controllers/admin/adminPropertyController.js');
  const PUBLIC = 'https://proj.supabase.co/storage/v1/object/public/property-images/properties/' + UUID + '/b.png';
  const upMock = mock.method(storage, 'uploadPropertyImage', async () => ({ objectPath: 'properties/x/b.png', publicUrl: PUBLIC }));
  const savedDriver = storage.driver; storage.driver = 'supabase'; // force supabase branch
  const findProp = mock.method(db.Property, 'findByPk', async () => ({ id: UUID }));
  const updMock = mock.method(db.PropertyImage, 'update', async () => [1]);
  const maxMock = mock.method(db.PropertyImage, 'max', async () => 0);
  const createMock = mock.method(db.PropertyImage, 'create', async (data) => {
    assert.equal(data.url, PUBLIC); // public HTTPS URL in the admin flow too
    return { id: '11111111-2222-3333-4444-555555555555', ...data, created_at: new Date() };
  });
  const findOneMock = mock.method(db.PropertyImage, 'findOne', async () => ({ id: '11111111-2222-3333-4444-555555555555', url: PUBLIC, destroy: async () => {} }));
  let removedUrl = null;
  const rmMock = mock.method(storage, 'removePropertyImage', async (url) => { removedUrl = url; return true; });
  try {
    const res1 = response();
    await uploadImage(
      { params: { id: UUID }, file: { buffer: Buffer.from('x'), mimetype: 'image/png', filename: 'n.png' }, body: {} },
      res1
    );
    assert.equal(res1.statusCode, 201);
    assert.equal(res1.body.ok, true);
    assert.equal(res1.body.image.url, PUBLIC); // response shape unchanged, now with https URL

    const res2 = response();
    await deleteImage({ params: { propertyId: UUID, imageId: '11111111-2222-3333-4444-555555555555' } }, res2);
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);
    assert.equal(removedUrl, PUBLIC); // Supabase object removal attempted for bucket URLs
  } finally {
    for (const m of [upMock, findProp, updMock, maxMock, createMock, findOneMock, rmMock]) m.mock.restore();
    storage.driver = savedDriver;
  }
});

test('admin delete legacy /uploads/... keeps local unlink; DB row still destroyed', async () => {
  const { deleteImage } = await import('../controllers/admin/adminPropertyController.js');
  const { UPLOAD_DIR } = await import('../config/upload.js');
  const legacyFile = path.join(UPLOAD_DIR, 'legacy-del.png'); // the controller unlinks UPLOAD_DIR/<basename>
  fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
  fs.writeFileSync(legacyFile, 'x');
  const findProp = mock.method(db.Property, 'findByPk', async () => ({ id: UUID }));
  const legacyMock = mock.method(db.PropertyImage, 'findOne', async () => ({ id: '11111111-2222-3333-4444-555555555555', url: '/uploads/legacy-del.png', destroy: async () => {} }));
  const rmMock = mock.method(storage, 'removePropertyImage', async () => { throw new Error('must not be called for legacy URLs'); });
  try {
    const res = response();
    await deleteImage({ params: { propertyId: UUID, imageId: '11111111-2222-3333-4444-555555555555' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(fs.existsSync(legacyFile), false); // legacy unlink still happens
  } finally {
    for (const m of [findProp, legacyMock, rmMock]) m.mock.restore();
    try { fs.unlinkSync(legacyFile); } catch {}
  }
});

test('seller ownership + validation semantics remain enforced', async () => {
  // Ownership is resolved inside the query as { id, owner_id: req.user.id };
  // foreign/missing property → 404 before any storage call.
  const ownerScoped = mock.method(db.Property, 'findOne', async (opts) => {
    assert.deepEqual(opts.where, { id: UUID, owner_id: 'seller-1' });
    return null;
  });
  try {
    const res = response();
    await uploadImages(makeReq([fileObj('o.png')]), res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.ok, false);
  } finally { ownerScoped.mock.restore(); }

  // Shared validation (both drivers): MIME allow-list + 5 MB cap unchanged.
  const { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, fileFilter } = await import('../config/upload.js');
  assert.equal(MAX_FILE_SIZE, 5 * 1024 * 1024);
  assert.deepEqual(Object.keys(ALLOWED_MIME_TYPES).sort(), ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  let filterResult = null;
  fileFilter({}, { mimetype: 'application/pdf' }, (err, ok) => { filterResult = { err, ok }; });
  assert.equal(filterResult.ok, false);
  assert.match(filterResult.err.message, /Unsupported file type/);
  filterResult = null;
  fileFilter({}, { mimetype: 'image/webp' }, (err, ok) => { filterResult = { err, ok }; });
  assert.deepEqual(filterResult, { err: null, ok: true });
});