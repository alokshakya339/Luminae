const express = require('express');
const Guest = require('../models/Guest');
const WeddingPhoto = require('../models/WeddingPhoto');
const authMiddleware = require('../middleware/auth');
const { isFaceMatch } = require('../services/faceService');

const router = express.Router();

// GET /api/photos/my — return all photos where the guest's face appears
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const guest = await Guest.findById(req.guestId).populate('matchedPhotoIds');
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    // if no matches yet, re-run face matching against all processed photos
    if (guest.matchedPhotoIds.length === 0 && guest.faceDescriptor?.length > 0) {
      const photos = await WeddingPhoto.find({ creatorId: guest.creatorId, faceCount: { $gt: 0 } });
      const matched = [];
      for (const photo of photos) {
        for (const faceDesc of photo.faceDescriptors) {
          if (isFaceMatch(guest.faceDescriptor, faceDesc)) {
            matched.push(photo._id);
            break;
          }
        }
      }
      if (matched.length > 0) {
        guest.matchedPhotoIds = matched;
        await guest.save();
        await guest.populate('matchedPhotoIds');
      }
    }

    res.json({
      guest: { name: guest.name, email: guest.email },
      photos: guest.matchedPhotoIds,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
