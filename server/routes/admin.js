const express = require('express');
const WeddingPhoto = require('../models/WeddingPhoto');
const Guest = require('../models/Guest');
const Creator = require('../models/Creator');

const router = express.Router();

// Protect all admin routes with a secret header
router.use((req, res, next) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// GET /api/admin/stats — global stats across all creators
router.get('/stats', async (req, res) => {
  try {
    const [photoCount, guestCount, creatorCount] = await Promise.all([
      WeddingPhoto.countDocuments(),
      Guest.countDocuments(),
      Creator.countDocuments(),
    ]);
    res.json({ photoCount, guestCount, creatorCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
