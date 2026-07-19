export function TrainerImage({
  src,
  name,
  className = '',
}: {
  src: string;
  name: string;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-end justify-center overflow-hidden ${className}`}>
      <img
        src={src}
        alt={`${name} trainer sprite`}
        className="h-full w-full object-contain [image-rendering:pixelated]"
      />
    </div>
  );
}
