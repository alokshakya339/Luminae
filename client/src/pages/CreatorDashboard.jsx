import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreator } from '../context/CreatorContext';
import { getCreatorMe, triggerSync, updateDriveFolder, processFaces, rematchGuests } from '../api/creator';

export default function CreatorDashboard() {
  const { creator, login: refreshCreator, logout } = useCreator();
  const [stats, setStats] = useState(null);
  const [serviceEmail, setServiceEmail] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [processProgress, setProcessProgress] = useState(null); // { total, remaining }
  const [syncResult, setSyncResult] = useState(null);
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
    setSyncResult(null);
    try {
      const { data } = await triggerSync();
      setSyncResult(data);
      toast.success(`Sync complete: ${data.added} new photos added.`);
      setStats(s => s ? { ...s, photoCount: s.photoCount + data.added } : s);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleProcessFaces = async () => {
    setProcessing(true);
    setProcessProgress(null);
    try {
      // get initial count
      const first = await processFaces();
      if (first.data.done) {
        toast.success('All faces already processed!');
        setProcessing(false);
        return;
      }
      const total = first.data.remaining + 1;
      setProcessProgress({ total, remaining: first.data.remaining });

      let done = false;
      while (!done) {
        const { data } = await processFaces();
        done = data.done;
        if (!done) setProcessProgress({ total, remaining: data.remaining });
      }
      toast.success('All faces processed!');
      setProcessProgress(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Face processing failed');
      setProcessProgress(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleRematch = async () => {
    setRematching(true);
    try {
      const { data } = await rematchGuests();
      toast.success(`Rematch done: ${data.guests} guests, ${data.totalMatches} total photo matches.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rematch failed');
    } finally {
      setRematching(false);
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              className="auth-card__submit"
              style={{ maxWidth: '220px' }}
              onClick={handleSync}
              disabled={syncing || processing}
            >
              {syncing ? 'Syncing...' : 'Sync Photos'}
            </button>
            <button
              className="auth-card__submit"
              style={{ maxWidth: '220px', background: processing ? '#888' : '#6b46c1' }}
              onClick={handleProcessFaces}
              disabled={processing || syncing || rematching}
            >
              {processing ? 'Processing...' : 'Process Faces'}
            </button>
            <button
              className="auth-card__submit"
              style={{ maxWidth: '220px', background: rematching ? '#888' : '#2563eb' }}
              onClick={handleRematch}
              disabled={processing || syncing || rematching}
            >
              {rematching ? 'Rematching...' : 'Rematch Guests'}
            </button>
          </div>

          {/* Sync loader */}
          {syncing && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.9rem' }}>
                <div className="spinner" style={{ width: '16px', height: '16px' }} />
                Fetching photos from Google Drive...
              </div>
            </div>
          )}

          {/* Sync result */}
          {syncResult && !syncing && (
            <div style={{ marginTop: '14px', fontSize: '0.9rem', color: '#555' }}>
              Found <strong>{syncResult.total}</strong> photos —{' '}
              <strong>{syncResult.added}</strong> new, <strong>{syncResult.skipped}</strong> already synced.
            </div>
          )}

          {/* Face processing progress bar */}
          {processing && processProgress && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#555', marginBottom: '6px' }}>
                <span>Processing faces...</span>
                <span>{processProgress.total - processProgress.remaining} / {processProgress.total}</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '999px',
                  background: '#6b46c1',
                  width: `${((processProgress.total - processProgress.remaining) / processProgress.total) * 100}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ marginTop: '6px', fontSize: '0.8rem', color: '#888' }}>
                Keep this tab open. Processing one photo at a time.
              </p>
            </div>
          )}
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
