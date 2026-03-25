import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';

interface ProfilePhotoCropModalProps {
  file: File;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<string | null>;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_CROP_SIZE = 320;
const EXPORT_SIZE = 1080;

export default function ProfilePhotoCropModal({
  file,
  isSubmitting,
  onCancel,
  onConfirm,
}: ProfilePhotoCropModalProps) {
  const cropBoxRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [cropSize, setCropSize] = useState(DEFAULT_CROP_SIZE);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setLoadedImage(null);
    setLocalError(null);

    const image = new window.Image();
    image.onload = () => setLoadedImage(image);
    image.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const element = cropBoxRef.current;
    if (!element) return;

    const updateCropSize = () => {
      const nextSize = Math.round(element.getBoundingClientRect().width) || DEFAULT_CROP_SIZE;
      setCropSize(nextSize);
    };

    updateCropSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateCropSize);
      return () => window.removeEventListener('resize', updateCropSize);
    }

    const observer = new ResizeObserver(() => updateCropSize());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loadedImage || !cropSize) return;

    const nextBaseScale = Math.max(
      cropSize / loadedImage.naturalWidth,
      cropSize / loadedImage.naturalHeight
    );
    const nextWidth = loadedImage.naturalWidth * nextBaseScale;
    const nextHeight = loadedImage.naturalHeight * nextBaseScale;

    setBaseScale(nextBaseScale);
    setZoom(1);
    setPosition({
      x: (cropSize - nextWidth) / 2,
      y: (cropSize - nextHeight) / 2,
    });
  }, [cropSize, loadedImage]);

  const clampPosition = (x: number, y: number, nextZoom = zoom) => {
    if (!loadedImage) return { x: 0, y: 0 };

    const displayWidth = loadedImage.naturalWidth * baseScale * nextZoom;
    const displayHeight = loadedImage.naturalHeight * baseScale * nextZoom;

    const minX = Math.min(0, cropSize - displayWidth);
    const minY = Math.min(0, cropSize - displayHeight);

    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  const updateZoom = (nextZoom: number) => {
    if (!loadedImage) return;

    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const currentScale = baseScale * zoom;
    const nextScale = baseScale * clampedZoom;
    const focus = cropSize / 2;

    const nextPosition = clampPosition(
      focus - ((focus - position.x) * nextScale) / currentScale,
      focus - ((focus - position.y) * nextScale) / currentScale,
      clampedZoom
    );

    setZoom(clampedZoom);
    setPosition(nextPosition);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loadedImage || isSubmitting) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position.x,
      startY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;

    setPosition(
      clampPosition(dragState.startX + deltaX, dragState.startY + deltaY)
    );
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const handleReset = () => {
    if (!loadedImage) return;

    const resetWidth = loadedImage.naturalWidth * baseScale;
    const resetHeight = loadedImage.naturalHeight * baseScale;
    setZoom(1);
    setPosition({
      x: (cropSize - resetWidth) / 2,
      y: (cropSize - resetHeight) / 2,
    });
    setLocalError(null);
  };

  const handleConfirm = async () => {
    if (!loadedImage) return;

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;

    const context = canvas.getContext('2d');
    if (!context) {
      setLocalError('Unable to prepare the cropped image.');
      return;
    }

    const ratio = EXPORT_SIZE / cropSize;
    const displayWidth = loadedImage.naturalWidth * baseScale * zoom;
    const displayHeight = loadedImage.naturalHeight * baseScale * zoom;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      loadedImage,
      position.x * ratio,
      position.y * ratio,
      displayWidth * ratio,
      displayHeight * ratio
    );

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });

    if (!blob) {
      setLocalError('Unable to export the cropped image.');
      return;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile-photo';
    const croppedFile = new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
    const error = await onConfirm(croppedFile);

    if (error) {
      setLocalError(error);
    }
  };

  const displayWidth = loadedImage ? loadedImage.naturalWidth * baseScale * zoom : cropSize;
  const displayHeight = loadedImage ? loadedImage.naturalHeight * baseScale * zoom : cropSize;

  return (
    <div className="modal-backdrop px-4 py-6">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-gray-900">Adjust Profile Picture</h3>
            <p className="mt-1 text-sm text-gray-500">
              Drag and zoom the photo. Only the area inside the frame will be visible.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close crop modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-[2rem] border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
          <div
            ref={cropBoxRef}
            className="relative mx-auto aspect-square w-full max-w-sm touch-none overflow-hidden rounded-[2rem] bg-primary-950/5"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Profile photo crop preview"
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
                style={{
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  transform: `translate(${position.x}px, ${position.y}px)`,
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] border-[3px] border-white/90 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.18)]" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.25)}
              disabled={isSubmitting || !loadedImage}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={isSubmitting || !loadedImage}
              onChange={event => updateZoom(Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-primary-600"
            />
            <button
              type="button"
              onClick={() => updateZoom(zoom + 0.25)}
              disabled={isSubmitting || !loadedImage}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{zoom.toFixed(2)}x zoom</span>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting || !loadedImage}
              className="inline-flex items-center gap-1 font-semibold text-primary-600 transition-colors hover:text-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {localError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {localError}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleConfirm(); }}
            disabled={isSubmitting || !loadedImage}
            className="btn-primary"
          >
            {isSubmitting ? 'Saving...' : 'Use This Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
