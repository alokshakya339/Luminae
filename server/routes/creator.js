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

// POST /api/creator/sync — pull photos from Drive, extract faces, match guests
router.post('/sync', creatorAuth, async (req, res) => {
  try {
    const creator = await Creator.findById(req.creatorId);
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    res.json({ message: 'Sync started. Check server logs for progress.' });

    (async () => {
      console.log(`\n=== Sync started for: ${creator.name} (${creator.albumCode}) ===`);
      const files = await listPhotosInFolder(creator.driveFolderId);
      console.log(`Found ${files.length} photos in Drive folder`);

      let processed = 0, skipped = 0;

      for (const file of files) {
        try {
          const existing = await WeddingPhoto.findOne({ driveFileId: file.id, creatorId: creator._id });
          if (existing) { skipped++; continue; }

          const ext = path.extname(file.name) || '.jpg';
          const localFilename = `photo_${file.id}${ext}`;
          const tmpPath = path.join(os.tmpdir(), localFilename);

          await downloadFile(file.id, tmpPath);
          const descriptors = await extractAllDescriptors(tmpPath);
          await fs.promises.unlink(tmpPath).catch(() => {});

          const photo = await WeddingPhoto.create({
            creatorId: creator._id,
            driveFileId: file.id,
            originalName: file.name,
            localFilename,
            faceDescriptors: descriptors,
            faceCount: descriptors.length,
          });

          if (descriptors.length > 0) {
            const guests = await Guest.find({ creatorId: creator._id });
            for (const guest of guests) {
              for (const faceDesc of descriptors) {
                if (isFaceMatch(guest.faceDescriptor, faceDesc)) {
                  if (!guest.matchedPhotoIds.includes(photo._id)) {
                    guest.matchedPhotoIds.push(photo._id);
                    await guest.save();
                  }
                  break;
                }
              }
            }
          }

          processed++;
          console.log(`[${processed + skipped}/${files.length}] ${file.name} — ${descriptors.length} face(s)`);

          // pause every 10 photos to let GC free memory
          if (processed % 10 === 0) await new Promise(r => setTimeout(r, 1000));
        } catch (fileErr) {
          console.error(`Failed on ${file.name}:`, fileErr.message);
        }
      }

      console.log(`=== Sync complete: ${processed} new, ${skipped} skipped ===`);
    })();
  } catch (err) {
    console.error('Sync error:', err.message);
  }
});

module.exports = router;
