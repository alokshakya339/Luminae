const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const photoRoutes = require('./routes/photos');
const adminRoutes = require('./routes/admin');
const creatorRoutes = require('./routes/creator');
const { loadModels } = require('./services/faceService');
const { streamFile } = require('./services/driveService');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// Stream wedding photos directly from Google Drive — no local disk needed
app.get('/photos/:filename', async (req, res) => {
  // filename format written by admin sync: photo_<driveFileId>.ext
  const match = req.params.filename.match(/^photo_(.+)\.[^.]+$/);
  if (!match) return res.status(404).json({ error: 'Not found' });
  try {
    const { stream, mimeType } = await streamFile(match[1]);
    res.setHeader('Content-Type', mimeType);
    stream.pipe(res);
  } catch (err) {
    console.error('Photo stream error:', err.message);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/creator', creatorRoutes);

app.get('/', (req, res) => res.json({ message: 'Wedding Photo API running' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    console.log('Loading face recognition models...');
    await loadModels();
    app.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch((err) => {
    console.error('Startup error:', err.message);
    process.exit(1);
  });
