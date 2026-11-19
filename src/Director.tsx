import { useEffect, useRef, useState } from "react";
import { Sparkles, LoaderCircle, ShieldCheck } from "lucide-react";
import type { Photo } from "./model";
import { validatePlan, type DirectorPlan } from "./edit-plan.mjs";
export default function Director({
  photos,
  onApply,
  editRevision,
}: {
  photos: Photo[];
  onApply: (plan: DirectorPlan) => void;
  editRevision?: string;
}) {
  const [prompt, setPrompt] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [plan, setPlan] = useState<DirectorPlan>(),
    [undo, setUndo] = useState(false);
  const request = useRef<AbortController | undefined>(undefined);
  const revision = JSON.stringify([
    editRevision,
    photos.map((p) => [
      p.id,
      p.name,
      p.caption,
      p.selected,
      p.pinned,
      p.kind,
      p.durationSeconds,
      p.trimStart,
      p.trimEnd,
      p.focalX,
      p.focalY,
      p.holdWeight,
    ]),
  ]);
  const current = useRef(revision);
  current.current = revision;
  const planRevision = useRef("");
  useEffect(() => {
    request.current?.abort();
    setBusy(false);
    setPlan(undefined);
  }, [revision]);
  useEffect(() => () => request.current?.abort(), []);
  return (
    <section className="director">
      <div className="panel-label">
        <Sparkles size={16} />
        AI DIRECTOR · REAL MEMORIES ONLY
      </div>
      <h3>Describe the feeling.</h3>
      <p>
        Direct your film in your own words. AI can suggest the order, captions,
        mood, and length. Your photos, faces, and recorded moments stay
        unchanged.
      </p>
      <textarea
        aria-label="Describe your birthday film"
        rows={3}
        maxLength={2000}
        placeholder="Start funny, include the beach photos, then finish with a heartfelt birthday message. Keep it natural, 45 seconds."
        value={prompt}
        onChange={(e) => {
          request.current?.abort();
          setPrompt(e.target.value);
          setPlan(undefined);
        }}
      />
      <label className="director-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            request.current?.abort();
            setConsent(e.target.checked);
            setPlan(undefined);
          }}
        />
        Allow these instructions, selected file labels, captions, and clip
        lengths to be read by the local AI service for this request. File labels
        can contain names. Media files and saved profile details stay on this
        device.
      </label>
      <div className="director-status">
        <ShieldCheck size={13} />
        Requires the local AI companion and a downloaded Ollama model. It cannot
        see inside photos; describe key moments in your prompt.
      </div>
      <div className="director-actions">
        <button
          className="button plum"
          disabled={!consent || prompt.trim().length < 8 || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            setPlan(undefined);
            const controller = new AbortController();
            const requestedRevision = revision;
            request.current = controller;
            const timeout = setTimeout(() => controller.abort(), 120000);
            try {
              const response = await fetch("/api/director", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Keepsake-Request": "local-director",
                },
                body: JSON.stringify({
                  prompt,
                  media: photos
                    .filter((p) => p.selected)
                    .slice(0, 100)
                    .map((p) => ({
                      id: p.id,
                      label: p.name.slice(0, 100),
                      caption: p.caption,
                      kind: p.kind ?? "photo",
                      durationSeconds: p.durationSeconds,
                    })),
                }),
                signal: controller.signal,
              });
              if (!response.ok)
                throw new Error(
                  response.status === 503
                    ? "The local AI model is not connected. Start the companion with your downloaded model; your manual editor remains available."
                    : "The director is unavailable. Nothing was changed.",
                );
              const value = await response.json();
              if (
                controller.signal.aborted ||
                current.current !== requestedRevision
              )
                return;
              planRevision.current = requestedRevision;
              setPlan(
                validatePlan(
                  value,
                  photos.filter((p) => p.selected).map((p) => p.id),
                  photos,
                ),
              );
            } catch (e) {
              if (
                request.current !== controller ||
                current.current !== requestedRevision
              )
                return;
              setError(
                (e as Error).name === "AbortError"
                  ? "The request timed out or was cancelled. Nothing was changed."
                  : (e as Error).message,
              );
            } finally {
              clearTimeout(timeout);
              if (request.current === controller) setBusy(false);
            }
          }}
        >
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}{" "}
          {busy ? "Planning your film…" : "Suggest a film plan"}
        </button>
        {busy && (
          <button
            className="button outline"
            onClick={() => request.current?.abort()}
          >
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {plan && planRevision.current === revision && (
        <div className="director-plan">
          <strong>{plan.summary}</strong>
          <p>
            {plan.duration} seconds · {plan.tone} · {plan.format}
          </p>
          <ol>
            {plan.sequence.map((id) => (
              <li key={id}>{photos.find((p) => p.id === id)?.name}</li>
            ))}
          </ol>
          <p>Closing: {plan.closing}</p>
          {plan.clips?.map((c) => (
            <p key={c.id}>
              Trim {photos.find((p) => p.id === c.id)?.name}: {c.start}s–{c.end}
              s
            </p>
          ))}
          <button
            className="button plum"
            onClick={() => {
              onApply(plan);
              setPlan(undefined);
              setUndo(true);
            }}
          >
            Apply this plan
          </button>
        </div>
      )}
      {undo && (
        <p>
          Plan applied. Your pinned memories are preserved. You can adjust every
          caption and move each memory in the editor.
        </p>
      )}
    </section>
  );
}
