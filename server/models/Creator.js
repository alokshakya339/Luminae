const mongoose = require('mongoose');

const creatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    driveFolderId: { type: String, required: true },
    albumCode: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Creator', creatorSchema);
