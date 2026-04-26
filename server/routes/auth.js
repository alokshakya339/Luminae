const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Guest = require('../models/Guest');
const WeddingPhoto = require('../models/WeddingPhoto');
const Creator = require('../models/Creator');
const { extractDescriptor, isFaceMatch } = require('../services/faceService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function uploadSelfie(req, res, next) {
  uploadSelfie(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ error: 'Image too large. Please upload a photo under 5 MB.' });
    res.status(400).json({ error: err.message });
  });
}

// Write buffer to a temp file, run fn(tmpPath), then delete the temp file
async function withTempFile(buffer, originalname, fn) {
  const ext = path.extname(originalname) || '.jpg';
  const tmpPath = path.join(os.tmpdir(), `selfie_${uuidv4()}${ext}`);
  await fs.promises.writeFile(tmpPath, buffer);
  try {
    return await fn(tmpPath);
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

function signToken(id) {
  return jwt.sign({ id, role: 'guest' }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Find all wedding photos (scoped to this creator's album) that contain the given face
async function findMatchedPhotos(descriptor, creatorId) {
  const allPhotos = await WeddingPhoto.find({ creatorId, faceCount: { $gt: 0 } });
  const matchedIds = [];
  for (const photo of allPhotos) {
    for (const faceDesc of photo.faceDescriptors) {
      if (isFaceMatch(descriptor, faceDesc)) {
        matchedIds.push(photo._id);
        break;
      }
    }
  }
  return matchedIds;
}

// POST /api/auth/signup
router.post('/signup', uploadSelfie, async (req, res) => {
  try {
    const { name, email, albumCode } = req.body;
    if (!name || !email || !albumCode) return res.status(400).json({ error: 'Name, email, and album code are required' });
    if (!req.file) return res.status(400).json({ error: 'Selfie photo is required' });

    const creator = await Creator.findOne({ albumCode: albumCode.toUpperCase().trim() });
    if (!creator) return res.status(400).json({ error: 'Invalid album code. Ask your photographer for the correct code.' });

    const exists = await Guest.findOne({ email: email.toLowerCase(), creatorId: creator._id });
    if (exists) return res.status(400).json({ error: 'Email already registered for this album. Please log in.' });

    const descriptor = await withTempFile(req.file.buffer, req.file.originalname, extractDescriptor);
    if (!descriptor) {
      return res.status(400).json({
        error: 'No face detected in your selfie. Please upload a clear, well-lit photo of your face.',
      });
    }

    const matchedPhotoIds = await findMatchedPhotos(descriptor, creator._id);

    const guest = await Guest.create({
      creatorId: creator._id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      faceDescriptor: descriptor,
      matchedPhotoIds,
    });

    res.status(201).json({
      token: signToken(guest._id),
      guest: { id: guest._id, name: guest.name, email: guest.email, matchCount: matchedPhotoIds.length },
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login  — verify identity by face
router.post('/login', uploadSelfie, async (req, res) => {
  try {
    const { email, albumCode } = req.body;
    if (!email || !albumCode) return res.status(400).json({ error: 'Email and album code are required' });
    if (!req.file) return res.status(400).json({ error: 'Selfie is required to verify your identity' });

    const creator = await Creator.findOne({ albumCode: albumCode.toUpperCase().trim() });
    if (!creator) return res.status(400).json({ error: 'Invalid album code.' });

    const guest = await Guest.findOne({ email: email.toLowerCase(), creatorId: creator._id });
    if (!guest) return res.status(404).json({ error: 'No account found for this album. Please sign up first.' });

    const descriptor = await withTempFile(req.file.buffer, req.file.originalname, extractDescriptor);
    if (!descriptor) return res.status(400).json({ error: 'No face detected in selfie.' });

    if (!isFaceMatch(descriptor, guest.faceDescriptor)) {
      return res.status(401).json({ error: 'Face does not match our records. Access denied.' });
    }

    res.json({
      token: signToken(guest._id),
      guest: { id: guest._id, name: guest.name, email: guest.email, matchCount: guest.matchedPhotoIds.length },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
