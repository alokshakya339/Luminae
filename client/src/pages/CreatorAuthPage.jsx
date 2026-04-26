import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreator } from '../context/CreatorContext';
import { creatorSignup, creatorLogin } from '../api/creator';

export default function CreatorAuthPage() {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useCreator();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return toast.error('Email and password are required');
    if (tab === 'signup' && !name.trim()) return toast.error('Name is required');
    if (tab === 'signup' && !driveFolderUrl.trim()) return toast.error('Google Drive folder URL is required');

    setLoading(true);
    try {
      const payload =
        tab === 'signup'
          ? { name: name.trim(), email: email.trim(), password, driveFolderUrl: driveFolderUrl.trim() }
          : { email: email.trim(), password };

      const apiFn = tab === 'signup' ? creatorSignup : creatorLogin;
      const { data } = await apiFn(payload);
      authLogin(data.token, data.creator);
      toast.success(tab === 'signup' ? `Welcome, ${data.creator.name}! Your album code is ${data.creator.albumCode}` : `Welcome back, ${data.creator.name}!`);
      navigate('/creator/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Photographer Portal</h1>
        <p className="auth-card__subtitle">
          Create an album, sync your Drive folder, and share your unique code with guests.
        </p>

        <div className="auth-card__tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>
            Log In
          </button>
          <button className={tab === 'signup' ? 'active' : ''} onClick={() => setTab('signup')}>
            Create Account
          </button>
        </div>

        <form className="auth-card__form" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="auth-card__field">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Photography"
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
            <label>Password</label>
            <input
              type="password"
              placeholder="Choose a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {tab === 'signup' && (
            <div className="auth-card__field">
              <label>Google Drive Folder URL</label>
              <input
                type="text"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrl(e.target.value)}
              />
              <span className="auth-card__hint-text">
                Paste the link to your Google Drive folder containing the wedding photos.
              </span>
            </div>
          )}

          <button className="auth-card__submit" type="submit" disabled={loading}>
            {loading
              ? tab === 'signup' ? 'Creating account...' : 'Logging in...'
              : tab === 'signup' ? 'Create Album' : 'Log In'}
          </button>
        </form>

        <p className="auth-card__hint" style={{ marginTop: '16px' }}>
          Are you a guest?{' '}
          <Link to="/auth" style={{ color: 'var(--primary-dark, #9e6b6b)' }}>
            Find your photos here
          </Link>
        </p>
      </div>
    </div>
  );
}
