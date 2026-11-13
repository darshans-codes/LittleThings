export type Person = {
  id: string;
  name: string;
  relation: string;
  birthday: string;
  avatar?: string;
  tone: string;
  demo?: boolean;
};
export type Photo = {
  kind?: "photo" | "video";
  poster?: string;
  pinned?: boolean;
  id: string;
  personId: string;
  src: string;
  name: string;
  hash?: string;
  selected: boolean;
  reason?: string;
  caption: string;
  demo?: boolean;
};
export type Story = {
  music?: { src: string; name: string };
  voice?: { src: string; name: string };
  id: string;
  personId: string;
  title: string;
  tone: string;
  duration: number;
  format: string;
  photoIds: string[];
  created: string;
  closing: string;
};
export type State = {
  people: Person[];
  photos: Photo[];
  stories: Story[];
  onboarded: boolean;
  reminderDays: number;
};
export const tones = ["Emotional", "Funny", "Elegant", "Timeline"];
export function daysUntil(birthday: string, now = new Date()): number {
  const [, m, d] = birthday.split("-").map(Number);
  const year = now.getFullYear();
  const target = (y: number) =>
    new Date(y, m - 1, Math.min(d, new Date(y, m, 0).getDate()));
  const today = Date.UTC(year, now.getMonth(), now.getDate());
  let next = target(year);
  if (Date.UTC(year, next.getMonth(), next.getDate()) < today)
    next = target(year + 1);
  return Math.round(
    (Date.UTC(next.getFullYear(), next.getMonth(), next.getDate()) - today) /
      86400000,
  );
}
export function birthdayLabel(birthday: string) {
  const [, m, d] = birthday.split("-").map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
function future(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `2000-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function seed(): State {
  return {
    onboarded: false,
    reminderDays: 7,
    people: [
      {
        id: "maya",
        name: "Maya",
        relation: "Best friend",
        birthday: future(5),
        avatar: "/photos/maya.jpg",
        tone: "Emotional",
        demo: true,
      },
      {
        id: "arjun",
        name: "Arjun",
        relation: "Brother",
        birthday: future(12),
        avatar: "/photos/arjun.jpg",
        tone: "Funny",
        demo: true,
      },
      {
        id: "mom",
        name: "Mom",
        relation: "Family",
        birthday: future(23),
        avatar: "/photos/mom.jpg",
        tone: "Elegant",
        demo: true,
      },
    ],
    photos: [
      {
        id: "p1",
        personId: "maya",
        src: "/photos/friends.jpg",
        name: "A day to remember",
        selected: true,
        caption: "The best days are the ones we share.",
        demo: true,
      },
      {
        id: "p2",
        personId: "maya",
        src: "/photos/couple.jpg",
        name: "Little moments",
        selected: true,
        caption: "Here’s to all the little moments.",
        demo: true,
      },
      {
        id: "p3",
        personId: "maya",
        src: "/photos/family.jpg",
        name: "Together is a good place",
        selected: true,
        caption: "And the people who make them special.",
        demo: true,
      },
      {
        id: "p4",
        personId: "arjun",
        src: "/photos/friends.jpg",
        name: "Good company",
        selected: true,
        caption: "More memories, more laughter.",
        demo: true,
      },
      {
        id: "p5",
        personId: "mom",
        src: "/photos/family.jpg",
        name: "Our favorite place",
        selected: true,
        caption: "Home is wherever we are together.",
        demo: true,
      },
    ],
    stories: [],
  };
}
export function captionFor(tone: string, index: number, name: string) {
  const options: Record<string, string[]> = {
    Emotional: [
      "Some moments stay with us.",
      "Life is sweeter with you in it.",
      "Here’s to many more memories together.",
    ],
    Funny: [
      "Another year of excellent decisions. Mostly.",
      "Main character energy, as always.",
      "Aging like a very good playlist.",
    ],
    Elegant: [
      "A moment worth keeping.",
      "A beautiful chapter.",
      `To you, ${name}.`,
    ],
    Timeline: [
      "A little look back.",
      "The moments in between.",
      "And so the story continues.",
    ],
  };
  return (options[tone] || options.Emotional)[index % 3];
}
