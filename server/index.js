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
const { fetchFileBuffer } = require('./services/driveService');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0) return cb(null, true);
    const allowed =
      allowedOrigins.some(o => o === origin) ||
      origin.endsWith('.vercel.app');
    cb(allowed ? null : new Error('CORS: origin not allowed'), allowed);
  },
  credentials: true,
}));
app.use(express.json());

// Stream wedding photos directly from Google Drive — no local disk needed
app.get('/photos/:filename', async (req, res) => {
  const match = req.params.filename.match(/^photo_(.+)\.[^.]+$/);
  if (!match) return res.status(404).json({ error: 'Not found' });
  try {
    const { buffer, mimeType } = await fetchFileBuffer(match[1]);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('Photo fetch error:', err.message);
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
