import axios from 'axios';

const API = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const signup = (formData) => API.post('/auth/signup', formData);
export const login = (formData) => API.post('/auth/login', formData);
export const getMyPhotos = () => API.get('/photos/my');
