import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';

interface ModalPortalProps {
  children: ReactNode;
}

export default function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setMounted(true);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
