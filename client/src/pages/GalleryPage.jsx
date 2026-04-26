import { useState, useEffect } from 'react';
import { getMyPhotos } from '../api/index';
import PhotoCard from '../components/PhotoCard';
import Lightbox from '../components/Lightbox';
import toast from 'react-hot-toast';

export default function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    getMyPhotos()
      .then(({ data }) => setPhotos(data?.photos ?? []))
      .catch(() => toast.error('Failed to load your photos'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="gallery-page">
      <div className="gallery-hero">
        <h1>Photos</h1>
        <p>These are all the moments captured with you in them</p>
        {!loading && (
          <div className="gallery-hero__badge">
            {photos?.length} photo{photos?.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      <div className="gallery-body">
        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner" />
            <span>Finding your photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📷</div>
            <h3>No photos found yet</h3>
            <p>
              The wedding photos may still be uploading.<br />
              Check back soon — our system scans all photos for your face!
            </p>
          </div>
        ) : (
          <div className="gallery-grid">
            {photos.map((photo, i) => (
              <PhotoCard key={photo._id} photo={photo} onOpen={() => setLightboxIndex(i)} />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onNav={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
