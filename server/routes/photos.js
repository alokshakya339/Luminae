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

    // filter out nulls from stale ObjectIds
    const validPhotos = guest.matchedPhotoIds.filter(Boolean);

    console.log(`Guest ${guest.email}: storedIds=${guest.matchedPhotoIds.length}, validPhotos=${validPhotos.length}, creatorId=${guest.creatorId}`);

    // re-run face matching if no valid photos found
    if (validPhotos.length === 0 && guest.faceDescriptor?.length > 0) {
      const photos = await WeddingPhoto.find({ creatorId: guest.creatorId, faceCount: { $gt: 0 } });
      console.log(`Rematch: found ${photos.length} processed photos for creatorId=${guest.creatorId}`);
      const matched = [];
      for (const photo of photos) {
        for (const faceDesc of photo.faceDescriptors) {
          if (isFaceMatch(guest.faceDescriptor, faceDesc)) {
            matched.push(photo._id);
            break;
          }
        }
      }
      console.log(`Rematch result: ${matched.length} matches`);
      guest.matchedPhotoIds = matched;
      await guest.save();
      await guest.populate('matchedPhotoIds');
      return res.json({
        guest: { name: guest.name, email: guest.email },
        photos: guest.matchedPhotoIds.filter(Boolean),
      });
    }

    res.json({
      guest: { name: guest.name, email: guest.email },
      photos: validPhotos,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
