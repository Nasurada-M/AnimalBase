import { useEffect } from 'react';
import { X } from 'lucide-react';
import ModalPortal from './ModalPortal';

interface ImageLightboxProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({
  imageUrl,
  alt,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative flex max-h-[92vh] max-w-[92vw] items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg transition-colors hover:bg-white"
            aria-label="Close full image preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={imageUrl}
            alt={alt}
            className="max-h-[92vh] max-w-[92vw] rounded-3xl object-contain shadow-2xl"
          />
        </div>
      </div>
    </ModalPortal>
  );
}
