export type DirectorPlan = {
  summary: string;
  tone: string;
  duration: number;
  format: string;
  sequence: string[];
  captions: { id: string; text: string }[];
  closing: string;
  clips?: { id: string; start: number; end: number }[];
};
export function validatePlan(
  value: unknown,
  allowedIds: string[],
  media?: { id: string; kind?: string; durationSeconds?: number }[],
): DirectorPlan;
export const planSchema: Record<string, unknown>;
