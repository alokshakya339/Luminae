import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { signup, login } from '../api/index';

export default function AuthPage() {
  const [tab, setTab] = useState('signup'); // 'signup' | 'login'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [albumCode, setAlbumCode] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return toast.error('Please select an image');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email is required');
    if (tab === 'signup' && !name.trim()) return toast.error('Name is required');
    if (!file) return toast.error('Please upload your selfie photo');

    if (!albumCode.trim()) return toast.error('Album code is required');

    const formData = new FormData();
    formData.append('selfie', file);
    formData.append('email', email.trim());
    formData.append('albumCode', albumCode.trim().toUpperCase());
    if (tab === 'signup') formData.append('name', name.trim());

    setLoading(true);
    try {
      const apiFn = tab === 'signup' ? signup : login;
      const { data } = await apiFn(formData);
      authLogin(data.token, data.guest);
      toast.success(
        tab === 'signup'
          ? `Welcome, ${data.guest.name}! Found ${data.guest.matchCount} photo(s) with you.`
          : `Welcome back, ${data.guest.name}!`
      );
      navigate('/gallery');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">♡ Wedding Memories</h1>
        <p className="auth-card__subtitle">
          Upload your selfie and we'll find all the photos you're in!
        </p>

        <div className="auth-card__tabs">
          <button className={tab === 'signup' ? 'active' : ''} onClick={() => setTab('signup')}>
            Sign Up
          </button>
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>
            Log In
          </button>
        </div>

        <form className="auth-card__form" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="auth-card__field">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="auth-card__field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-card__field">
            <label>Album Code</label>
            <input
              type="text"
              placeholder="e.g. A7X2B9KM"
              value={albumCode}
              onChange={(e) => setAlbumCode(e.target.value.toUpperCase())}
              style={{ letterSpacing: '2px', fontWeight: 600 }}
            />
            <span className="auth-card__hint-text">Ask your photographer for this code.</span>
          </div>

          <div className="auth-card__field">
            <label>Your Selfie (used for face matching)</label>
            <div
              className={`auth-card__selfie-zone${preview ? ' auth-card__selfie-zone--preview' : ''}`}
              onClick={() => inputRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {preview ? (
                <>
                  <img src={preview} alt="Your selfie" />
                  <p>Click to change</p>
                </>
              ) : (
                <>
                  <div className="icon">🤳</div>
                  <p>Click or drag & drop your selfie</p>
                  <p>Make sure your face is clearly visible</p>
                </>
              )}
            </div>
          </div>

          <button className="auth-card__submit" type="submit" disabled={loading}>
            {loading
              ? tab === 'signup' ? 'Finding your photos...' : 'Verifying...'
              : tab === 'signup' ? '✦ Sign Up & Find My Photos' : '✦ Log In'}
          </button>
        </form>

        <p className="auth-card__hint">
          {tab === 'signup'
            ? 'Already registered? Switch to Log In above.'
            : 'New here? Switch to Sign Up above.'}
        </p>
        <p className="auth-card__hint" style={{ marginTop: '8px' }}>
          Are you a photographer?{' '}
          <Link to="/creator" style={{ color: 'var(--primary-dark, #9e6b6b)' }}>
            Go to Photographer Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
