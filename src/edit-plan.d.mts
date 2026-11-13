export type DirectorPlan = {
  summary: string;
  tone: string;
  duration: number;
  format: string;
  sequence: string[];
  captions: { id: string; text: string }[];
  closing: string;
};
export function validatePlan(
  value: unknown,
  allowedIds: string[],
): DirectorPlan;
export const planSchema: Record<string, unknown>;
