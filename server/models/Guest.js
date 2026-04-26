const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    selfieFilename: { type: String },
    faceDescriptor: { type: [Number], required: true },
    matchedPhotoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WeddingPhoto' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Guest', guestSchema);
