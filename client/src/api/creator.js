import axios from 'axios';

const API = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api/creator` });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('creatorToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const creatorSignup = (data) => API.post('/signup', data);
export const creatorLogin = (data) => API.post('/login', data);
export const getCreatorMe = () => API.get('/me');
export const updateDriveFolder = (driveFolderUrl) => API.patch('/folder', { driveFolderUrl });
export const triggerSync = () => API.post('/sync');
export const processFaces = () => API.post('/process-faces');
