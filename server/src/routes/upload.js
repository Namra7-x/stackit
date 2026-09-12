const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authRequired, denyAdminWrites } = require('../middleware/auth');
const { ok, fail } = require('../middleware/response');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _f, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 5);
    const safe = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (png, jpg, gif, webp, svg) are allowed'));
  }
});

// Optional Cloudinary passthrough: if env configured, upload buffer to Cloudinary via REST (no SDK)
async function uploadToCloudinary(localPath, filename) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return null;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash('sha1').update(`timestamp=${timestamp}${secret}`).digest('hex');
    const buf = fs.readFileSync(localPath);
    const blob = new Blob([buf]);
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('api_key', key);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
    const j = await r.json();
    if (j.secure_url) {
      try { fs.unlinkSync(localPath); } catch {}
      return j.secure_url;
    }
  } catch (e) {
    console.warn('[upload] cloudinary failed, using local:', e.message);
  }
  return null;
}

router.post('/', authRequired, denyAdminWrites, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return fail(res, 400, 'UPLOAD_ERROR', err.message);
    if (!req.file) return fail(res, 400, 'UPLOAD_ERROR', 'No image provided');
    const publicPath = `/uploads/${req.file.filename}`;
    const base = `${req.protocol}://${req.get('host')}`;
    // try cloudinary
    const cloudUrl = await uploadToCloudinary(req.file.path, req.file.filename);
    const url = cloudUrl || `${base}${publicPath}`;
    return ok(res, { url }, 'Image uploaded');
  });
});

module.exports = router;
