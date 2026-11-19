import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Play, Pause } from "lucide-react";
import type { Person, Photo, Story } from "./model";
import { createFilmSession, type FilmSession } from "./film-session";
import { dimensions } from "./film-timeline";

export default function FilmPreview({
  person,
  photos,
  story,
  activeIndex,
}: {
  person: Person;
  photos: Photo[];
  story: Story;
  activeIndex: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const film = useRef<FilmSession | undefined>(undefined);
  const audio = useRef<AudioContext | undefined>(undefined);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0);
  const time = useRef(0),
    frame = useRef(0);
  const latest = useRef({ person, photos, story });
  latest.current = { person, photos, story };
  const sourceRevision = useRef({ sources: [] as string[], version: 0 });
  const sourceValues = photos.map((p) => p.src);
  if (
    sourceValues.length !== sourceRevision.current.sources.length ||
    sourceValues.some((src, i) => src !== sourceRevision.current.sources[i])
  )
    sourceRevision.current = {
      sources: sourceValues,
      version: sourceRevision.current.version + 1,
    };
  // Sources are immutable per media ID; include edited visual and audio settings in the session revision.
  const revision = JSON.stringify([
    sourceRevision.current.version,
    person.id,
    person.name,
    story.tone,
    story.duration,
    story.format,
    story.transition,
    story.closing,
    photos.map((p) => [
      p.id,
      p.caption,
      p.trimStart,
      p.trimEnd,
      p.focalX,
      p.focalY,
      p.holdWeight,
    ]),
    story.music?.volume,
    story.voice?.startSeconds,
  ]);
  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setError("");
    setPlaying(false);
    cancelAnimationFrame(frame.current);
    film.current?.dispose();
    film.current = undefined;
    void audio.current?.close().catch(() => {});
    audio.current = undefined;
    const config = latest.current;
    const load = async () => {
      try {
        const session = await createFilmSession(
          config.person,
          config.photos,
          config.story,
          controller.signal,
        );
        if (controller.signal.aborted) {
          session.dispose();
          return;
        }
        film.current = session;
        const currentConfig = latest.current;
        session.updateSettings(
          currentConfig.person,
          currentConfig.photos,
          currentConfig.story,
        );
        session.onSeeked(() => {
          if (!controller.signal.aborted && canvas.current)
            session.draw(canvas.current.getContext("2d")!, time.current);
        });
        time.current = session.timeline[activeIndex]?.start ?? 0;
        session.sync(time.current, false);
        session.draw(canvas.current!.getContext("2d")!, time.current);
        setPosition(time.current);
        setReady(true);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    };
    void load();
    return () => {
      controller.abort();
      cancelAnimationFrame(frame.current);
      film.current?.dispose();
      film.current = undefined;
      void audio.current?.close().catch(() => {});
      audio.current = undefined;
    };
  }, [sourceRevision.current.version, story.music?.src, story.voice?.src]);

  function seek(seconds: number) {
    setPlaying(false);
    cancelAnimationFrame(frame.current);
    time.current = seconds;
    setPosition(seconds);
    film.current?.sync(seconds, false, audio.current);
    film.current?.draw(canvas.current!.getContext("2d")!, seconds);
  }
  useEffect(() => {
    if (!film.current) return;
    film.current.updateSettings(person, photos, story);
    seek(film.current.timeline[activeIndex]?.start ?? 0);
  }, [activeIndex, revision]);
  useEffect(() => {
    if (!playing || !film.current || !audio.current) return;
    const session = film.current,
      context = audio.current;
    const start = performance.now() - time.current * 1000;
    const tick = () => {
      try {
        const seconds = Math.min(
          (performance.now() - start) / 1000,
          story.duration,
        );
        session.sync(seconds, seconds < story.duration, context);
        session.draw(canvas.current!.getContext("2d")!, seconds);
        time.current = seconds;
        setPosition(seconds);
        if (seconds < story.duration)
          frame.current = requestAnimationFrame(tick);
        else setPlaying(false);
      } catch (e) {
        session.pause();
        setError((e as Error).message);
        setPlaying(false);
      }
    };
    tick();
    return () => {
      cancelAnimationFrame(frame.current);
      session.pause();
    };
  }, [playing, story.duration]);
  const [w, h] = dimensions[story.format];
  return (
    <section className="film-preview" aria-label="Film preview">
      <canvas
        ref={canvas}
        width={w}
        height={h}
        style={{ aspectRatio: `${w}/${h}` }}
        aria-label={`Birthday film for ${person.name}`}
      />
      {!ready && !error && (
        <p role="status">
          <LoaderCircle className="spin" size={16} /> Opening your memories…
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="film-transport">
        <button
          className="button outline"
          disabled={!ready}
          aria-label={playing ? "Pause film" : "Play film"}
          onClick={async () => {
            if (playing) {
              setPlaying(false);
              return;
            }
            try {
              if (!audio.current) {
                audio.current = new AudioContext();
                film.current!.connectAudio(
                  audio.current,
                  audio.current.destination,
                );
              }
              await audio.current.resume();
              if (time.current >= story.duration) time.current = 0;
              setError("");
              setPlaying(true);
            } catch {
              setError("Audio could not start. Tap play to retry.");
            }
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? "Pause" : "Play film"}
        </button>
        <span>
          {position.toFixed(1)} / {story.duration}s
        </span>
      </div>
      <input
        aria-label="Scrub film"
        type="range"
        min="0"
        max={story.duration}
        step="0.1"
        value={position}
        disabled={!ready}
        onChange={(e) => seek(+e.target.value)}
      />
      <p className="fine-print">
        Preview and export share the same film layout, timing, framing, and
        sound mix. Device encoding can affect the final file.
      </p>
    </section>
  );
}
