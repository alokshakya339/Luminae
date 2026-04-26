import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreator } from '../context/CreatorContext';
import { getCreatorMe, triggerSync, updateDriveFolder } from '../api/creator';

export default function CreatorDashboard() {
  const { creator, login: refreshCreator, logout } = useCreator();
  const [stats, setStats] = useState(null);
  const [serviceEmail, setServiceEmail] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newFolderUrl, setNewFolderUrl] = useState('');
  const [updatingFolder, setUpdatingFolder] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCreatorMe()
      .then(({ data }) => {
        setStats({ photoCount: data.photoCount, guestCount: data.guestCount });
        setServiceEmail(data.serviceAccountEmail || '');
        refreshCreator(localStorage.getItem('creatorToken'), {
          id: data._id,
          name: data.name,
          email: data.email,
          albumCode: data.albumCode,
          driveFolderId: data.driveFolderId,
        });
      })
      .catch(() => toast.error('Failed to load dashboard'));
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(creator.albumCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSync();
      toast.success('Sync started! This may take a few minutes. Refresh stats after it completes.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderUrl.trim()) return;
    setUpdatingFolder(true);
    try {
      await updateDriveFolder(newFolderUrl.trim());
      toast.success('Drive folder updated. Run a sync to process new photos.');
      setNewFolderUrl('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setUpdatingFolder(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/creator');
  };

  return (
    <div className="creator-dashboard">
      <header className="header">
        <div className="container">
          <div className="header__brand">
            <span>♡</span> Photographer Portal
          </div>
          <div className="header__user">
            <span>Welcome, <strong>{creator?.name}</strong></span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      <div className="creator-dashboard__body container">

        {/* Album Code — the star of the show */}
        <section className="creator-card creator-card--highlight">
          <h2>Your Album Code</h2>
          <p className="creator-card__sub">Share this code with your guests so they can find their photos.</p>
          <div className="creator-code-box">
            <span className="creator-code-box__code">{creator?.albumCode}</span>
            <button className="creator-code-box__copy" onClick={copyCode}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="creator-card">
          <h2>Album Stats</h2>
          {stats ? (
            <div className="creator-stats">
              <div className="creator-stats__item">
                <span className="creator-stats__num">{stats.photoCount}</span>
                <span className="creator-stats__label">Photos synced</span>
              </div>
              <div className="creator-stats__item">
                <span className="creator-stats__num">{stats.guestCount}</span>
                <span className="creator-stats__label">Guests registered</span>
              </div>
            </div>
          ) : (
            <div className="spinner-wrap"><div className="spinner" /></div>
          )}
        </section>

        {/* Sync */}
        <section className="creator-card">
          <h2>Sync Photos from Drive</h2>
          <p className="creator-card__sub">
            Current folder ID: <code>{creator?.driveFolderId}</code>
          </p>
          {serviceEmail && (
            <div className="creator-notice">
              Share your Drive folder with this service account email:
              <strong> {serviceEmail}</strong>
            </div>
          )}
          <button
            className="auth-card__submit"
            style={{ marginTop: '16px', maxWidth: '220px' }}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Starting sync...' : 'Sync Now'}
          </button>
        </section>

        {/* Update folder */}
        <section className="creator-card">
          <h2>Update Drive Folder</h2>
          <p className="creator-card__sub">Point to a different Google Drive folder.</p>
          <form onSubmit={handleUpdateFolder} className="creator-folder-form">
            <input
              type="text"
              placeholder="https://drive.google.com/drive/folders/..."
              value={newFolderUrl}
              onChange={(e) => setNewFolderUrl(e.target.value)}
            />
            <button type="submit" disabled={updatingFolder}>
              {updatingFolder ? 'Saving...' : 'Update'}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
