import { useEffect, useCallback } from 'react';

const BASE = `${import.meta.env.VITE_API_URL}/photos`;

export default function Lightbox({ photos, index, onClose, onNav }) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const prev = useCallback(() => hasPrev && onNav(index - 1), [hasPrev, index, onNav]);
  const next = useCallback(() => hasNext && onNav(index + 1), [hasNext, index, onNav]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  if (!photo) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox__close" onClick={onClose}>✕</button>

      {hasPrev && (
        <button className="lightbox__arrow lightbox__arrow--prev" onClick={(e) => { e.stopPropagation(); prev(); }}>
          ‹
        </button>
      )}

      <div className="lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img
          className="lightbox__img"
          src={`${BASE}/${photo.localFilename}`}
          alt={photo.originalName}
        />
        <div className="lightbox__info">
          <span className="lightbox__name">
            {photo.originalName}
            <span className="lightbox__counter">{index + 1} / {photos.length}</span>
          </span>
          <a
            className="lightbox__download"
            href={`${BASE}/${photo.localFilename}`}
            download={photo.originalName}
          >
            ↓ Download Photo
          </a>
        </div>
      </div>

      {hasNext && (
        <button className="lightbox__arrow lightbox__arrow--next" onClick={(e) => { e.stopPropagation(); next(); }}>
          ›
        </button>
      )}
    </div>
  );
}
