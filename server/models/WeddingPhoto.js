const mongoose = require('mongoose');

const weddingPhotoSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    driveFileId: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    localFilename: { type: String, required: true },
    // Each element is one face's 128-dim descriptor
    faceDescriptors: { type: [[Number]], default: [] },
    faceCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WeddingPhoto', weddingPhotoSchema);
