import { useEffect } from 'react';

const ImageLightbox = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose}>
      <img src={imageUrl} alt="full view" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

export default ImageLightbox;
