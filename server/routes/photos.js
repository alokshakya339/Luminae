const express = require('express');
const Guest = require('../models/Guest');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/photos/my — return all photos where the guest's face appears
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const guest = await Guest.findById(req.guestId).populate('matchedPhotoIds');
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json({
      guest: { name: guest.name, email: guest.email },
      photos: guest.matchedPhotoIds,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
