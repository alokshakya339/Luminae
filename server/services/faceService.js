// Must be required first so tfjs-node backend is registered before face-api loads
const tf = require('@tensorflow/tfjs-node');

const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const path = require('path');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  // Models are bundled inside the @vladmandic/face-api package
  const modelsPath = path.join(
    __dirname,
    '../node_modules/@vladmandic/face-api/model'
  );
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
  modelsLoaded = true;
  console.log('Face recognition models loaded');
}

// Returns a single face descriptor (Float32Array as plain array) or null
async function extractDescriptor(imagePath) {
  await loadModels();
  const img = await canvas.loadImage(imagePath);
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;
  return Array.from(detection.descriptor);
}

// Returns descriptors for ALL faces found in an image
async function extractAllDescriptors(imagePath) {
  await loadModels();
  const img = await canvas.loadImage(imagePath);
  const detections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors();
  const result = detections.map((d) => Array.from(d.descriptor));
  tf.dispose(detections);
  tf.engine().endScope();
  return result;
}

// Euclidean distance between two 128-dim descriptors
function euclideanDistance(d1, d2) {
  return Math.sqrt(
    d1.reduce((sum, val, i) => sum + (val - d2[i]) ** 2, 0)
  );
}

function isFaceMatch(descriptor1, descriptor2, threshold = 0.5) {
  return euclideanDistance(descriptor1, descriptor2) < threshold;
}

module.exports = { loadModels, extractDescriptor, extractAllDescriptors, isFaceMatch };
