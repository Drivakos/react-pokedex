import { memo, useLayoutEffect, useMemo, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { Sprites } from '@pkmn/img';

const spriteRoot = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

interface BattlePokemonImageProps {
  id: number;
  species: string;
  side?: 'p1' | 'p2';
  variant?: 'artwork' | 'battle' | 'icon';
  className?: string;
}

interface SpriteLayout {
  width: number;
  height: number;
  left: string;
  bottom: number;
}

export const BattlePokemonImage = memo(function BattlePokemonImage({
  id,
  species,
  side = 'p2',
  variant = 'battle',
  className = '',
}: BattlePokemonImageProps) {
  const sources = useMemo(() => {
    const showdown = Sprites.getPokemon(species, { side, gen: variant === 'icon' ? 5 : 'ani' }).url;
    const front = `${spriteRoot}/${id}.png`;
    const back = `${spriteRoot}/back/${id}.png`;
    const artwork = `${spriteRoot}/other/official-artwork/${id}.png`;
    const animatedFront = `${spriteRoot}/other/showdown/${id}.gif`;
    const animatedBack = `${spriteRoot}/other/showdown/back/${id}.gif`;

    if (id <= 0) return [showdown];
    if (variant === 'artwork') return [artwork, front, showdown];
    if (variant === 'icon') return [front, artwork, showdown];
    return side === 'p1'
      ? [animatedBack, back, animatedFront, front, artwork, showdown]
      : [animatedFront, front, artwork, showdown];
  }, [id, side, species, variant]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [layout, setLayout] = useState<SpriteLayout | null>(null);

  useLayoutEffect(() => {
    setSourceIndex(0);
    setLayout(null);
  }, [sources]);

  const createLayout = (
    naturalWidth: number,
    naturalHeight: number,
    bounds: { x: number; y: number; width: number; height: number },
  ): SpriteLayout => {
    const maxVisibleWidth = side === 'p1' ? 136 : 120;
    const maxVisibleHeight = side === 'p1' ? 128 : 114;
    const scale = Math.min(maxVisibleWidth / bounds.width, maxVisibleHeight / bounds.height);
    const visibleCenter = (bounds.x + bounds.width / 2) * scale;
    const transparentBottom = naturalHeight - bounds.y - bounds.height;

    return {
      width: naturalWidth * scale,
      height: naturalHeight * scale,
      left: `calc(50% - ${visibleCenter}px)`,
      bottom: -(transparentBottom * scale),
    };
  };

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    if (variant !== 'battle') return;
    const image = event.currentTarget;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas is unavailable');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const alphaAt = (x: number, y: number) => pixels[(y * canvas.width + x) * 4 + 3];
      const opaqueCorners = [
        alphaAt(0, 0),
        alphaAt(canvas.width - 1, 0),
        alphaAt(0, canvas.height - 1),
        alphaAt(canvas.width - 1, canvas.height - 1),
      ].filter(alpha => alpha > 20).length;

      // Some mirrored GIFs contain an opaque canvas. Prefer the clean PNG fallback for those.
      if (opaqueCorners >= 3 && sourceIndex < sources.length - 1) {
        setLayout(null);
        setSourceIndex(index => index + 1);
        return;
      }

      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (alphaAt(x, y) <= 20) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      if (maxX < minX || maxY < minY) throw new Error('Sprite has no visible pixels');
      setLayout(createLayout(image.naturalWidth, image.naturalHeight, {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      }));
    } catch {
      setLayout(createLayout(image.naturalWidth, image.naturalHeight, {
        x: 0,
        y: 0,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }));
    }
  };

  if (sourceIndex >= sources.length) {
    return (
      <div
        role="img"
        aria-label={species}
        className={`flex items-center justify-center rounded-full bg-white/70 ${className}`}
      >
        <svg viewBox="0 0 100 100" className="h-2/3 w-2/3 drop-shadow" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="#fff" stroke="#1e293b" strokeWidth="7" />
          <path d="M7 50a43 43 0 0 1 86 0H7Z" fill="#ef4444" />
          <path d="M7 50h86" stroke="#1e293b" strokeWidth="8" />
          <circle cx="50" cy="50" r="14" fill="#fff" stroke="#1e293b" strokeWidth="7" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={species}
      loading={variant === 'icon' ? 'lazy' : 'eager'}
      decoding="async"
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      onLoad={handleLoad}
      onError={() => {
        setLayout(null);
        setSourceIndex(index => index + 1);
      }}
      className={`object-contain ${className}`}
      style={{
        imageRendering: variant === 'artwork' ? 'auto' : 'pixelated',
        ...(variant === 'battle'
          ? layout
            ? {
                position: 'absolute',
                width: layout.width,
                height: layout.height,
                left: layout.left,
                bottom: layout.bottom,
                opacity: 1,
              }
            : { opacity: 0 }
          : {}),
      } as CSSProperties}
    />
  );
});
