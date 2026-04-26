import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { uploadPhoto } from '../api/photos';

export default function UploadForm({ onUpload }) {
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a photo');
    if (!guestName.trim()) return toast.error('Please enter your name');

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('guestName', guestName.trim());
    formData.append('message', message.trim());

    setLoading(true);
    try {
      const { data } = await uploadPhoto(formData);
      onUpload(data);
      toast.success('Photo uploaded!');
      setGuestName('');
      setMessage('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-section container">
      <h2>Share a Photo</h2>
      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="upload-form__field">
          <label>Your Name *</label>
          <input
            type="text"
            placeholder="e.g. Priya & Rahul"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
        </div>

        <div className="upload-form__field">
          <label>Message (optional)</label>
          <textarea
            rows={3}
            placeholder="Write a sweet message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div
          className={`upload-form__dropzone${preview ? ' upload-form__dropzone--preview' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {preview ? (
            <>
              <img src={preview} alt="Preview" />
              <p className="file-name">{file?.name}</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem' }}>📷</div>
              <p>Click or drag & drop a photo here</p>
              <p style={{ fontSize: '0.78rem' }}>JPG, PNG, WEBP — max 10 MB</p>
            </>
          )}
        </div>

        <button className="upload-form__submit" type="submit" disabled={loading}>
          {loading ? 'Uploading...' : '✦ Upload Photo'}
        </button>
      </form>
    </div>
  );
}
