import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { storage as storageCfg } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists (local driver only — Supabase mode never
// writes upload buffers to the local disk).
if (storageCfg.driver !== 'supabase' && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Maximum file size (5 MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '5242880', 10);

// Storage configuration (local driver — unchanged legacy behaviour)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate safe random filename
    const randomName = crypto.randomBytes(16).toString('hex');
    const extension = ALLOWED_MIME_TYPES[file.mimetype] || '.jpg';
    cb(null, `${randomName}${extension}`);
  },
});

// File filter — identical for both drivers (JPEG / PNG / WebP only)
export const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type. Allowed: JPEG, PNG, WebP`), false);
  }
};

// Shared filename generator: 16 random bytes as hex + validated extension.
// Used by the local diskStorage callback above AND by the Supabase branch so
// every driver produces the same object-name convention.
export const generateImageFilename = (mimetype) =>
  `${crypto.randomBytes(16).toString('hex')}${ALLOWED_MIME_TYPES[mimetype] || '.jpg'}`;

// Engine selection happens once at boot: local → disk, supabase → memory
// (buffers are pushed straight to the bucket, never persisted locally).
const storageEngine = storageCfg.driver === 'supabase' ? multer.memoryStorage() : diskStorage;

// Multer upload instance
export const upload = multer({
  storage: storageEngine,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// Multi-file upload instance for the Seller (client) image flow.
// Reuses the SAME storage engine, MIME allow-list and 5 MB per-file size limit
// as the single-file `upload` above — only the global file-count cap is dropped
// so a Seller can attach several images in one request. Does NOT alter the
// Admin route, which still imports the single-file `upload` (limits.files = 1).
export const uploadMulti = multer({
  storage: storageEngine,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export { UPLOAD_DIR, ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
