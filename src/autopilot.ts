import { captionFor, daysUntil, type State, type Story } from "./model";

export function occasionKey(birthday: string, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + daysUntil(birthday, now));
  return `${date.getFullYear()}-${birthday.slice(5)}`;
}

export function prepareBirthdays(state: State, now = new Date()): State {
  if (!state.autopilotEnabled) return state;
  const additions: Story[] = [];
  for (const person of state.people) {
    if (person.demo || daysUntil(person.birthday, now) > state.reminderDays)
      continue;
    const occasion = occasionKey(person.birthday, now);
    if (
      state.stories.some(
        (s) => s.personId === person.id && s.occasion === occasion,
      )
    )
      continue;
    // Preserve a manually started draft until its owner chooses to replace it.
    if (state.stories.some((s) => s.personId === person.id && !s.occasion))
      continue;
    const photos = state.photos.filter(
      (p) =>
        p.personId === person.id && p.selected && (!p.reason || p.reviewed),
    );
    additions.push({
      id: `birthday-${person.id}-${occasion}`,
      personId: person.id,
      title: `For ${person.name}, with love`,
      tone: person.tone,
      duration: 30,
      format: "Story",
      photoIds: photos.map((p) => p.id),
      created: now.toISOString(),
      closing: `Happy birthday, ${person.name}. Here’s to more moments like these.`,
      occasion,
      preparedByAutopilot: true,
    });
  }
  if (!additions.length) return state;
  const ids = new Set(additions.flatMap((s) => s.photoIds));
  return {
    ...state,
    stories: [...additions, ...state.stories],
    photos: state.photos.map((p) => {
      if (!ids.has(p.id) || p.caption) return p;
      const person = state.people.find((person) => person.id === p.personId)!;
      return {
        ...p,
        caption: captionFor(person.tone, state.photos.indexOf(p), person.name),
      };
    }),
  };
}
