export function validatePlan(value, allowedIds, media = []) {
  const p = value;
  if (
    !p ||
    typeof p.summary !== "string" ||
    p.summary.length > 400 ||
    !["Emotional", "Funny", "Elegant", "Timeline"].includes(p.tone) ||
    ![30, 45, 60].includes(p.duration) ||
    !["Story", "Square", "Feed", "Landscape"].includes(p.format) ||
    !Array.isArray(p.sequence) ||
    p.sequence.length > 100 ||
    !p.sequence.every(
      (id) => typeof id === "string" && allowedIds.includes(id),
    ) ||
    new Set(p.sequence).size !== p.sequence.length ||
    typeof p.closing !== "string" ||
    p.closing.length > 200 ||
    !Array.isArray(p.captions) ||
    p.captions.length > 100 ||
    !p.captions.every(
      (c) =>
        c &&
        allowedIds.includes(c.id) &&
        typeof c.text === "string" &&
        c.text.length <= 150,
    )
  )
    throw new Error(
      "The director returned an invalid plan. Nothing was changed.",
    );
  if (allowedIds.length && !p.sequence.length)
    throw new Error("The plan needs at least one of your selected memories.");
  if (
    new Set(p.captions.map((c) => c.id)).size !== p.captions.length ||
    p.captions.some((c) => !p.sequence.includes(c.id))
  )
    throw new Error("Captions must refer to distinct memories in this plan.");
  const clips = p.clips ?? [];
  if (
    !Array.isArray(clips) ||
    clips.length > 100 ||
    new Set(clips.map((c) => c?.id)).size !== clips.length ||
    clips.some((c) => {
      const source = media.find((m) => m.id === c?.id);
      return (
        !c ||
        !p.sequence.includes(c.id) ||
        source?.kind !== "video" ||
        !Number.isFinite(source.durationSeconds) ||
        !Number.isFinite(c.start) ||
        !Number.isFinite(c.end) ||
        c.start < 0 ||
        c.end <= c.start ||
        c.end > source.durationSeconds
      );
    })
  )
    throw new Error(
      "The director suggested an invalid clip range. Nothing was changed.",
    );
  return {
    summary: p.summary,
    tone: p.tone,
    duration: p.duration,
    format: p.format,
    sequence: p.sequence,
    captions: p.captions.map((c) => ({ id: c.id, text: c.text })),
    closing: p.closing,
    ...(clips.length
      ? { clips: clips.map((c) => ({ id: c.id, start: c.start, end: c.end })) }
      : {}),
  };
}
export const planSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "tone",
    "duration",
    "format",
    "sequence",
    "captions",
    "closing",
  ],
  properties: {
    summary: { type: "string" },
    tone: { enum: ["Emotional", "Funny", "Elegant", "Timeline"] },
    duration: { enum: [30, 45, 60] },
    format: { enum: ["Story", "Square", "Feed", "Landscape"] },
    sequence: { type: "array", items: { type: "string" } },
    captions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "text"],
        properties: { id: { type: "string" }, text: { type: "string" } },
      },
    },
    closing: { type: "string" },
    clips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "start", "end"],
        properties: {
          id: { type: "string" },
          start: { type: "number" },
          end: { type: "number" },
        },
      },
    },
  },
};
