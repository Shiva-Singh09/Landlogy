// ── Property image storage abstraction ──────────────────────────────────────
// STORAGE_DRIVER=local    (default/absent) → legacy local-disk behaviour kept by
//                                           config/upload.js (multer diskStorage,
//                                           URLs `/uploads/<random-hex>.<ext>`).
// STORAGE_DRIVER=supabase → NEW uploads go to Supabase Storage; the public HTTPS
//                           URL is stored directly in `property_images.url`.
// Legacy `/uploads/...` rows are never rewritten and keep working (dual-read is
// handled by the frontend's resolveImageURL, which passes absolute URLs through).
// Server-side only: the Supabase key is read from env and must never reach a
// client, an API response or a log line.
import { createClient } from '@supabase/supabase-js';

const DRIVER = (process.env.STORAGE_DRIVER || 'local').trim().toLowerCase();
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
// Credential fallback: SUPABASE_SECRET_KEY first, then the legacy variable name.
const SUPABASE_KEY = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim();

// Bucket is assumed to already exist (public). Application code never creates
// or deletes buckets.
export const SUPABASE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || 'property-images').trim();

// Fail fast on a misconfigured supabase driver instead of failing per request.
let client = null;
if (DRIVER === 'supabase') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      '[STORAGE] STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
    );
  }
  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// All property image objects live under a single prefix so cleanup can never
// touch unrelated buckets/objects.
export const PROPERTY_OBJECT_PREFIX = 'properties';
const PUBLIC_MARKER = '/storage/v1/object/public/';

// Object path convention: `properties/{propertyId}/{randomHex}.{ext}` — reuses
// the existing 16-byte random-hex filename convention from config/upload.js.
export const buildObjectPath = (propertyId, filename) =>
  `${PROPERTY_OBJECT_PREFIX}/${propertyId}/${filename}`;

// ── URL classification ──────────────────────────────────────────────────────
export const isLegacyUploadURL = (url) =>
  typeof url === 'string' && url.startsWith('/uploads/');

// True only for a public Storage URL of the CONFIGURED bucket on the CONFIGURED
// project origin. Anything else (other origins, other buckets, signed URLs) is
// deliberately not recognised.
export const isSupabaseStorageURL = (url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || !SUPABASE_URL) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === new URL(SUPABASE_URL).origin &&
      parsed.pathname.startsWith(`${PUBLIC_MARKER}${SUPABASE_BUCKET}/`)
    );
  } catch {
    return false;
  }
};

// Extract the object path from a recognised public URL. Returns null unless the
// URL belongs to the configured bucket AND the object sits under `properties/`.
export const objectPathFromURL = (url) => {
  if (!isSupabaseStorageURL(url)) return null;
  try {
    const prefix = `${PUBLIC_MARKER}${SUPABASE_BUCKET}/`;
    const objectPath = decodeURIComponent(new URL(url).pathname.slice(prefix.length));
    return objectPath.startsWith(`${PROPERTY_OBJECT_PREFIX}/`) ? objectPath : null;
  } catch {
    return null;
  }
};

// ── Upload / remove ─────────────────────────────────────────────────────────
// Uploads an in-memory buffer and returns { objectPath, publicUrl }.
export const uploadPropertyImage = async ({ propertyId, buffer, mimetype, filename }) => {
  if (!client) {
    throw new Error('Supabase storage is not enabled (STORAGE_DRIVER is not "supabase").');
  }
  const objectPath = buildObjectPath(propertyId, filename);
  const { error } = await client.storage
    .from(SUPABASE_BUCKET)
    .upload(objectPath, buffer, { contentType: mimetype, upsert: false });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  const { data } = client.storage.from(SUPABASE_BUCKET).getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error('Supabase did not return a public URL.');
  return { objectPath, publicUrl: data.publicUrl };
};

// Removes an object by exact path. Only paths under `properties/` are accepted.
// Best-effort: failures are logged and reported as `false`, never thrown, so a
// storage cleanup failure can never block a database deletion.
export const removeObjectPath = async (objectPath) => {
  if (!client || !objectPath || !objectPath.startsWith(`${PROPERTY_OBJECT_PREFIX}/`)) return false;
  try {
    const { error } = await client.storage.from(SUPABASE_BUCKET).remove([objectPath]);
    if (error) {
      console.error('[STORAGE] Supabase object remove failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[STORAGE] Supabase object remove failed:', err?.message || err);
    return false;
  }
};

// Removes the Supabase object behind a stored URL. Returns false for legacy
// `/uploads/...` URLs, unrecognised URLs or when the driver is off — the caller
// decides what (if anything) to do; DB deletion always proceeds.
export const removePropertyImage = async (url) => removeObjectPath(objectPathFromURL(url || ''));

// Plain object export so callers access members at call time (`storage.driver`,
// `storage.uploadPropertyImage(...)`) — which also keeps the module mockable
// with node:test `t.mock.method(storage, '...')`.
export const storage = {
  driver: DRIVER === 'supabase' ? 'supabase' : 'local',
  SUPABASE_BUCKET,
  buildObjectPath,
  isLegacyUploadURL,
  isSupabaseStorageURL,
  objectPathFromURL,
  uploadPropertyImage,
  removeObjectPath,
  removePropertyImage,
};

export default storage;
