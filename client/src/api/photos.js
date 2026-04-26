import axios from 'axios';

const API = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` });

export const fetchPhotos = () => API.get('/photos');
export const uploadPhoto = (formData) => API.post('/photos', formData);
export const likePhoto = (id) => API.patch(`/photos/${id}/like`);
export const deletePhoto = (id) => API.delete(`/photos/${id}`);
