const BASE = `${import.meta.env.VITE_API_URL}/photos`;

export default function PhotoCard({ photo, onOpen }) {
  const date = new Date(photo.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="photo-card" onClick={() => onOpen(photo)}>
      <img
        className="photo-card__img"
        src={`${BASE}/${photo.localFilename}`}
        alt={photo.originalName}
        loading="lazy"
      />
      <div className="photo-card__footer">
        <span>{photo.originalName}</span>
        <a
          href={`${BASE}/${photo.localFilename}`}
          download={photo.originalName}
          onClick={(e) => e.stopPropagation()}
        >
          ↓ Download
        </a>
      </div>
    </div>
  );
}
