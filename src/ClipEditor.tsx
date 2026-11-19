import type { Photo } from "./model";

export default function ClipEditor({
  photo,
  onChange,
}: {
  photo: Photo;
  onChange: (values: Partial<Photo>) => void;
}) {
  const total = photo.durationSeconds;
  if (!total)
    return <p className="fine-print">Reimport this clip to enable trimming.</p>;
  const start = photo.trimStart ?? 0,
    end = photo.trimEnd ?? total;
  const minimum = Math.min(0.25, total);
  return (
    <section className="clip-editor">
      <span className="eyebrow">CHOOSE THE MOMENT</span>
      <h3>Trim this clip</h3>
      <p>
        Keep {start.toFixed(1)}s–{end.toFixed(1)}s of {total.toFixed(1)}s. Your
        original stays intact.
      </p>
      <video
        key={`${photo.id}-${start}-${end}`}
        src={photo.src}
        poster={photo.poster}
        playsInline
        controls
        preload="metadata"
        onLoadedMetadata={(e) => {
          e.currentTarget.currentTime = start;
        }}
        onTimeUpdate={(e) => {
          if (e.currentTarget.currentTime >= end) {
            e.currentTarget.pause();
            e.currentTarget.currentTime = start;
          }
        }}
      />
      <label>
        Start · {start.toFixed(1)}s
        <input
          aria-label="Clip start"
          type="range"
          min="0"
          max={Math.max(0, end - minimum)}
          step="0.1"
          value={start}
          onChange={(e) =>
            onChange({ trimStart: +e.target.value, trimEnd: end })
          }
        />
      </label>
      <label>
        End · {end.toFixed(1)}s
        <input
          aria-label="Clip end"
          type="range"
          min={Math.min(total, start + minimum)}
          max={total}
          step="0.1"
          value={end}
          onChange={(e) =>
            onChange({ trimStart: start, trimEnd: +e.target.value })
          }
        />
      </label>
      <button
        className="text-button"
        onClick={() => onChange({ trimStart: 0, trimEnd: total })}
      >
        Use full clip
      </button>
    </section>
  );
}
