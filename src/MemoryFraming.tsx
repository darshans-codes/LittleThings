import type { Photo } from "./model";
import { filmTimeline } from "./film-timeline";

export default function MemoryFraming({
  photo,
  photos,
  duration,
  onChange,
}: {
  photo: Photo;
  photos: Photo[];
  duration: number;
  onChange: (values: Partial<Photo>) => void;
}) {
  const scene = filmTimeline(photos, duration).find(
    (s) => photos[s.index].id === photo.id,
  );
  return (
    <section className="clip-editor">
      <span className="eyebrow">GIVE THE MOMENT ITS SPACE</span>
      <h3>Framing & pacing</h3>
      <p>
        Keep the people you love in frame. Adjust the crop to suit this format.
      </p>
      <label>
        Horizontal framing
        <input
          aria-label="Horizontal framing"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={photo.focalX ?? 0.5}
          onChange={(e) => onChange({ focalX: +e.target.value })}
        />
      </label>
      <label>
        Vertical framing
        <input
          aria-label="Vertical framing"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={photo.focalY ?? 0.5}
          onChange={(e) => onChange({ focalY: +e.target.value })}
        />
      </label>
      <label>
        Time on this memory
        <select
          aria-label="Memory pacing"
          value={photo.holdWeight ?? 1}
          onChange={(e) => onChange({ holdWeight: +e.target.value })}
        >
          <option value="0.5">A quick moment</option>
          <option value="1">Natural pace</option>
          <option value="2">Linger a little</option>
          <option value="3">Make this the highlight</option>
        </select>
      </label>
      {scene && (
        <p className="fine-print">
          {(scene.end - scene.start).toFixed(1)} seconds in this film. Other
          memories rebalance to keep your chosen film length.
        </p>
      )}
      <button
        className="text-button"
        onClick={() => onChange({ focalX: 0.5, focalY: 0.5, holdWeight: 1 })}
      >
        Reset framing and pace
      </button>
    </section>
  );
}
