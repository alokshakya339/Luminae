const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Creator = require('../models/Creator');
const WeddingPhoto = require('../models/WeddingPhoto');
const Guest = require('../models/Guest');
const creatorAuth = require('../middleware/creatorAuth');
const { listPhotosInFolder, downloadFile } = require('../services/driveService');
const { extractAllDescriptors, isFaceMatch } = require('../services/faceService');

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id, role: 'creator' }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function generateAlbumCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function extractFolderId(input) {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

function getServiceAccountEmail() {
  try {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email;
  } catch {
    return null;
  }
}

// POST /api/creator/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, driveFolderUrl } = req.body;
    if (!name || !email || !password || !driveFolderUrl) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const exists = await Creator.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const driveFolderId = extractFolderId(driveFolderUrl);

    let albumCode, attempts = 0;
    do {
      albumCode = generateAlbumCode();
      attempts++;
    } while (attempts < 10 && await Creator.findOne({ albumCode }));

    const creator = await Creator.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      driveFolderId,
      albumCode,
    });

    res.status(201).json({
      token: signToken(creator._id),
      creator: {
        id: creator._id,
        name: creator.name,
        email: creator.email,
        albumCode: creator.albumCode,
        driveFolderId: creator.driveFolderId,
      },
    });
  } catch (err) {
    console.error('Creator signup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creator/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const creator = await Creator.findOne({ email: email.toLowerCase() });
    if (!creator) return res.status(404).json({ error: 'No account found' });

    const valid = await bcrypt.compare(password, creator.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    res.json({
      token: signToken(creator._id),
      creator: {
        id: creator._id,
        name: creator.name,
        email: creator.email,
        albumCode: creator.albumCode,
        driveFolderId: creator.driveFolderId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creator/me
router.get('/me', creatorAuth, async (req, res) => {
  try {
    const creator = await Creator.findById(req.creatorId).select('-passwordHash');
    if (!creator) return res.status(404).json({ error: 'Not found' });

    const [photoCount, guestCount] = await Promise.all([
      WeddingPhoto.countDocuments({ creatorId: req.creatorId }),
      Guest.countDocuments({ creatorId: req.creatorId }),
    ]);

    res.json({
      ...creator.toObject(),
      photoCount,
      guestCount,
      serviceAccountEmail: getServiceAccountEmail(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/creator/folder — update Drive folder URL
router.patch('/folder', creatorAuth, async (req, res) => {
  try {
    const { driveFolderUrl } = req.body;
    if (!driveFolderUrl) return res.status(400).json({ error: 'driveFolderUrl is required' });

    const driveFolderId = extractFolderId(driveFolderUrl);
    const creator = await Creator.findByIdAndUpdate(
      req.creatorId,
      { driveFolderId },
      { new: true }
    ).select('-passwordHash');

    res.json({ driveFolderId: creator.driveFolderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creator/photos — list all photos for the creator
router.get('/photos', creatorAuth, async (req, res) => {
  try {
    const photos = await WeddingPhoto.find({ creatorId: req.creatorId })
      .select('-faceDescriptors')
      .sort({ createdAt: -1 });
    res.json({ total: photos.length, photos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creator/sync — pull photo metadata from Drive (no face processing)
router.post('/sync', creatorAuth, async (req, res) => {
  try {
    const creator = await Creator.findById(req.creatorId);
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    const files = await listPhotosInFolder(creator.driveFolderId);
    let added = 0, skipped = 0;

    for (const file of files) {
      const ext = path.extname(file.name) || '.jpg';
      const result = await WeddingPhoto.updateOne(
        { driveFileId: file.id, creatorId: creator._id },
        { $setOnInsert: {
          creatorId: creator._id,
          driveFileId: file.id,
          originalName: file.name,
          localFilename: `photo_${file.id}${ext}`,
          faceDescriptors: [],
          faceCount: 0,
          faceProcessed: false,
        }},
        { upsert: true }
      );
      if (result.upsertedCount) added++;
      else skipped++;
    }

    console.log(`Sync done: ${added} new, ${skipped} skipped`);
    res.json({ message: 'Sync complete', total: files.length, added, skipped });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creator/reset-faces — reset all photos to unprocessed so they can be re-run
router.post('/reset-faces', creatorAuth, async (req, res) => {
  try {
    const result = await WeddingPhoto.updateMany(
      { creatorId: req.creatorId },
      { $set: { faceDescriptors: [], faceCount: 0, faceProcessed: false } }
    );
    await Guest.updateMany({ creatorId: req.creatorId }, { $set: { matchedPhotoIds: [] } });
    console.log(`Reset ${result.modifiedCount} photos for reprocessing`);
    res.json({ reset: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creator/process-faces — process one unprocessed photo at a time
router.post('/process-faces', creatorAuth, async (req, res) => {
  try {
    const photo = await WeddingPhoto.findOne({
      creatorId: req.creatorId,
      faceDescriptors: { $size: 0 },
      faceProcessed: { $ne: true },
    });

    if (!photo) return res.json({ done: true, message: 'All photos processed' });

    const ext = path.extname(photo.originalName) || '.jpg';
    const tmpPath = path.join(os.tmpdir(), `photo_${photo.driveFileId}${ext}`);

    await downloadFile(photo.driveFileId, tmpPath);
    const descriptors = await extractAllDescriptors(tmpPath);
    await fs.promises.unlink(tmpPath).catch(() => {});

    photo.faceDescriptors = descriptors;
    photo.faceCount = descriptors.length;
    photo.faceProcessed = true;
    await photo.save();

    if (descriptors.length > 0) {
      const guests = await Guest.find({ creatorId: req.creatorId });
      for (const guest of guests) {
        for (const faceDesc of descriptors) {
          if (isFaceMatch(guest.faceDescriptor, faceDesc)) {
            if (!guest.matchedPhotoIds.some(id => id.equals(photo._id))) {
              guest.matchedPhotoIds.push(photo._id);
              await guest.save();
            }
            break;
          }
        }
      }
    }

    const remaining = await WeddingPhoto.countDocuments({
      creatorId: req.creatorId,
      faceProcessed: { $ne: true },
    });

    console.log(`Processed: ${photo.originalName} — ${descriptors.length} face(s), ${remaining} remaining`);
    res.json({ done: false, processed: photo.originalName, faces: descriptors.length, remaining });
  } catch (err) {
    console.error('Process-faces error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creator/rematch — re-run face matching for all guests against all processed photos
router.post('/rematch', creatorAuth, async (req, res) => {
  try {
    const guests = await Guest.find({ creatorId: req.creatorId });
    const photos = await WeddingPhoto.find({ creatorId: req.creatorId, faceCount: { $gt: 0 } });

    let totalMatches = 0;
    for (const guest of guests) {
      const matched = [];
      for (const photo of photos) {
        for (const faceDesc of photo.faceDescriptors) {
          if (isFaceMatch(guest.faceDescriptor, faceDesc)) {
            matched.push(photo._id);
            break;
          }
        }
      }
      guest.matchedPhotoIds = matched;
      await guest.save();
      totalMatches += matched.length;
      console.log(`Rematch: ${guest.name} — ${matched.length} photos`);
    }

    res.json({ guests: guests.length, totalMatches });
  } catch (err) {
    console.error('Rematch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creator/stats — diagnostic info about processing state
router.get('/stats', creatorAuth, async (req, res) => {
  try {
    const total = await WeddingPhoto.countDocuments({ creatorId: req.creatorId });
    const processed = await WeddingPhoto.countDocuments({ creatorId: req.creatorId, faceProcessed: true });
    const withFaces = await WeddingPhoto.countDocuments({ creatorId: req.creatorId, faceCount: { $gt: 0 } });
    const guests = await Guest.find({ creatorId: req.creatorId }).select('name email matchedPhotoIds faceDescriptor');

    const guestInfo = guests.map(g => ({
      name: g.name,
      email: g.email,
      matchedCount: g.matchedPhotoIds.length,
      hasFaceDescriptor: g.faceDescriptor?.length > 0,
    }));

    res.json({ total, processed, withFaces, unprocessed: total - processed, guests: guestInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
