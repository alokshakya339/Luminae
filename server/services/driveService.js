const { google } = require('googleapis');
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

// Stream a Drive file directly to a response (no local disk needed)
async function streamFile(fileId) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const meta = await drive.files.get({ fileId, fields: 'mimeType' });
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return { stream: res.data, mimeType: meta.data.mimeType || 'image/jpeg' };
}

// List all image files inside a Drive folder
async function listPhotosInFolder(folderId) {
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id, name, mimeType)',
    pageSize: 1000,
  });
  return res.data.files || [];
}

// Download a Drive file to a local path
async function downloadFile(fileId, destPath) {
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  const writer = fs.createWriteStream(destPath);
  await streamPipeline(res.data, writer);
}

module.exports = { listPhotosInFolder, downloadFile, streamFile };
