import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimate } from 'motion/react';
import { playMikuAudio } from '../../lib/mikuAudio';

interface ClickNote {
  id: number;
  xOffset: number;
}

interface ClickableMikuImageProps {
  src: string;
  alt: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  wrapperClassName?: string;
  imgClassName?: string;
  loading?: 'eager' | 'lazy';
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  noteSize?: 'sm' | 'md';
}

export const ClickableMikuImage: React.FC<ClickableMikuImageProps> = ({
  src,
  alt,
  onError,
  wrapperClassName = '',
  imgClassName = '',
  loading,
  referrerPolicy,
  noteSize = 'sm',
}) => {
  const [scope, animate] = useAnimate();
  const [notes, setNotes] = useState<ClickNote[]>([]);
  const noteIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    playMikuAudio();

    if (scope.current) {
      void animate(
        scope.current,
        {
          scale: [1, 0.88, 1.1, 0.97, 1],
          rotate: [0, -5, 4, -2, 0],
          y: [0, 2, -4, 0],
        },
        { duration: 0.35, ease: 'easeOut' }
      );
    }

    const nextId = ++noteIdRef.current;
    const xOffset = ((nextId % 3) - 1) * (noteSize === 'md' ? 10 : 6);
    setNotes((prev) => [...prev.slice(-5), { id: nextId, xOffset }]);

    const timer = window.setTimeout(() => {
      setNotes((prev) => prev.filter((n) => n.id !== nextId));
    }, 550);
    timersRef.current.push(timer);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${alt} (click to play Mikudayo)`}
      className={`relative inline-flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer select-none focus:outline-none overflow-visible ${wrapperClassName}`}
    >
      <motion.div
        ref={scope}
        className="w-full h-full flex items-center justify-center bg-transparent"
      >
        <img
          src={src}
          alt={alt}
          onError={onError}
          loading={loading}
          referrerPolicy={referrerPolicy}
          draggable={false}
          className={`h-full w-full object-contain bg-transparent pointer-events-none select-none ${imgClassName}`}
        />
      </motion.div>

      {notes.map((n) => (
        <motion.span
          key={n.id}
          initial={{ opacity: 0.95, y: 0, x: n.xOffset, scale: 0.7 }}
          animate={{ opacity: 0, y: noteSize === 'md' ? -18 : -12, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`pointer-events-none absolute -top-1 right-0 font-bold text-cyan-300 drop-shadow-[0_1px_4px_rgba(34,211,238,0.6)] ${
            noteSize === 'md' ? 'text-sm' : 'text-[11px]'
          }`}
        >
          ♪
        </motion.span>
      ))}
    </button>
  );
};
