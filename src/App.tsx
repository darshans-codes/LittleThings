import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Sparkles,
  Heart,
  Users,
  CalendarDays,
  Images,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  ShieldCheck,
  Play,
  Pause,
  Download,
  Upload,
  SlidersHorizontal,
  VolumeX,
  Cake,
  MoreHorizontal,
  CheckCheck,
  LoaderCircle,
  Trash2,
  Search,
  Film,
  ImagePlus,
  LockKeyhole,
  CircleHelp,
  Menu,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  birthdayLabel,
  captionFor,
  daysUntil,
  seed,
  tones,
  type Person,
  type Photo,
  type State,
  type Story,
} from "./model";
import { loadState, saveState, importImage } from "./storage";
import { makeCollage, makeVideo, saveExport } from "./export";
import "./styles.css";
import "./refinements.css";

type Page = "Home" | "People" | "Upcoming" | "Memories" | "Settings";
type Flow = "review" | "studio" | "export";
const nav = [
  { name: "Home", icon: Sparkles },
  { name: "People", icon: Users },
  { name: "Upcoming", icon: CalendarDays },
  { name: "Memories", icon: Images },
] as const;
const uid = () => crypto.randomUUID();
const dateToday = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

export default function App() {
  const [state, setState] = useState<State>();
  const [page, setPage] = useState<Page>("Home");
  const [personId, setPersonId] = useState("maya");
  const [flow, setFlow] = useState<Flow>();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Person>();
  const [info, setInfo] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [saveError, setSaveError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    loadState()
      .then((s) => setState(s || seed()))
      .catch(() => {
        setState(seed());
        setSaveError(true);
      });
  }, []);
  useEffect(() => {
    if (!state) return;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => saveState(state))
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [flow, page]);
  function update(fn: (s: State) => State) {
    setState((s) => (s ? fn(s) : s));
  }
  if (!state)
    return (
      <div className="boot">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Making room for your memories…</p>
      </div>
    );
  const person = state.people.find((p) => p.id === personId) || state.people[0];
  const ordered = [...state.people].sort(
    (a, b) => daysUntil(a.birthday) - daysUntil(b.birthday),
  );
  const next = ordered[0];
  function navigate(p: Page) {
    setPage(p);
    setFlow(undefined);
    setQuery("");
    window.scrollTo(0, 0);
  }
  function openPerson(p: Person, stage: Flow = "review") {
    setPersonId(p.id);
    setFlow(stage);
    window.scrollTo(0, 0);
  }
  async function importFiles(files: FileList | null) {
    if (!files || !person) return;
    setBusy(`Preparing ${files.length} photo${files.length === 1 ? "" : "s"}…`);
    const added: Photo[] = [];
    let rejected = 0;
    const existing = new Set(
      state!.photos
        .filter((p) => p.personId === person.id)
        .map((p) => p.hash)
        .filter(Boolean),
    );
    for (const file of Array.from(files).slice(0, 100)) {
      try {
        const image = await importImage(file);
        const duplicate = existing.has(image.hash);
        existing.add(image.hash);
        added.push({
          id: uid(),
          personId: person.id,
          ...image,
          name: file.name,
          caption: "",
          selected: !duplicate && !image.reason,
          reason: duplicate ? "Exact duplicate" : image.reason,
        });
      } catch {
        rejected++;
      }
    }
    update((s) => ({ ...s, photos: [...s.photos, ...added], onboarded: true }));
    setBusy("");
    setFlow("review");
    setToast(
      `${added.length} photos added privately.${rejected ? ` ${rejected} files could not be opened.` : ""}${files.length > 100 ? " First 100 photos imported." : ""}`,
    );
    if (input.current) input.current.value = "";
  }
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <div className="workspace-label">YOUR LITTLE CORNER</div>
          <nav aria-label="Main navigation">
            {nav.map(({ name, icon: Icon }) => (
              <button
                key={name}
                className={`nav-item ${page === name && !flow ? "active" : ""}`}
                onClick={() => navigate(name)}
              >
                <Icon size={19} />
                <span>{name}</span>
                {name === "Upcoming" && (
                  <span className="nav-count">{state.people.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="little-star">✳</span>
            <p>
              Good memories.
              <br />
              <em>Even better together.</em>
            </p>
            <span>A little thought goes a long way.</span>
          </div>
          <div className="sidebar-bottom">
            <button
              className={`nav-item ${page === "Settings" ? "active" : ""}`}
              onClick={() => navigate("Settings")}
            >
              <Settings size={18} />
              Settings
            </button>
            <button
              className="profile"
              onClick={() =>
                setInfo(
                  "Welcome to your private space. People, imported photos, and story drafts are saved only on this device. No account is required for this first build.",
                )
              }
            >
              <span className="profile-icon">Y</span>
              <span>
                Your space<small>Made for your people</small>
              </span>
              <MoreHorizontal size={18} />
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-brand">
              <Brand />
            </div>
            <div className="breadcrumb">
              Your space <ChevronRight size={13} />
              <span>
                {flow
                  ? "Create a celebration"
                  : page === "Home"
                    ? "Overview"
                    : page}
              </span>
            </div>
            <div className="top-actions">
              <span className="private-indicator">
                <span />
                Private by default
              </span>
              <button
                className="icon-button help"
                aria-label="How Keepsake works"
                onClick={() =>
                  setInfo(
                    "Add someone you love, choose their photos, and create a birthday story. Your photos stay on this device. Nothing is posted or sent automatically. Sample people are included to help you explore; you can remove them in Settings.",
                  )
                }
              >
                <CircleHelp size={20} />
              </button>
              <button
                className="avatar-small"
                aria-label="Your settings"
                onClick={() => navigate("Settings")}
              >
                Y
              </button>
            </div>
          </header>
          {saveError && (
            <div className="storage-error" role="alert">
              Your device could not save this change. Keep this page open and
              free up storage before continuing.
            </div>
          )}
          <main id="main-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={flow || page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22 }}
              >
                {!flow && page === "Home" && (
                  <>
                    <div className="page-heading">
                      <div>
                        <div className="eyebrow">{dateToday}</div>
                        <h1>
                          A little thought.
                          <br className="mobile-break" />{" "}
                          <em>A lot of love.</em>
                        </h1>
                        <p>
                          For the people who make your life a little more
                          special.
                        </p>
                      </div>
                      <button
                        className="button plum"
                        onClick={() => setAddOpen(true)}
                      >
                        <Plus size={17} />
                        Add someone
                      </button>
                    </div>
                    <div className="home-columns">
                      <div className="home-primary">
                        <div className="section-label">
                          <span>
                            <span className="status-dot" /> A BIRTHDAY ON THE
                            HORIZON
                          </span>
                          <span>LET’S MAKE IT PERSONAL</span>
                        </div>
                        {next ? (
                          <section className="hero-card">
                            <img
                              className="hero-image"
                              src={
                                state.photos.find((p) => p.personId === next.id)
                                  ?.src || "/photos/family.jpg"
                              }
                              alt={
                                state.photos.some((p) => p.personId === next.id)
                                  ? `A memory for ${next.name}`
                                  : "Sample celebration background"
                              }
                            />
                            <div className="hero-shade" />
                            <div className="hero-top">
                              <span className="glass-tag">
                                <Cake size={14} />
                                {daysUntil(next.birthday) === 0
                                  ? "Today is the day"
                                  : `In ${daysUntil(next.birthday)} days`}
                              </span>
                              <span className="glass-tag subtle">
                                {next.demo
                                  ? "SAMPLE CELEBRATION"
                                  : birthdayLabel(next.birthday)}
                              </span>
                            </div>
                            <div className="hero-copy">
                              <div className="hero-kicker">
                                A WHOLE YEAR OF LITTLE MOMENTS
                              </div>
                              <h2>
                                Make {next.name}’s
                                <br />
                                day <em>unforgettable.</em>
                              </h2>
                              <p>
                                A story made from your favorite memories.
                                <br />A little love, beautifully put together.
                              </p>
                              <button
                                className="button ivory"
                                onClick={() => openPerson(next)}
                              >
                                Create {next.name}’s story{" "}
                                <ArrowRight size={17} />
                              </button>
                              <div className="hero-foot">
                                <ShieldCheck size={13} />
                                Only you decide what gets shared
                              </div>
                            </div>
                            <div className="hero-sticker">
                              <Sparkles size={21} />
                              <span>
                                made with
                                <br />
                                <em>a little magic</em>
                              </span>
                            </div>
                          </section>
                        ) : (
                          <section className="no-people">
                            <Sparkles size={32} />
                            <h2>Someone’s day starts here.</h2>
                            <p>
                              Add a person and turn your favorite memories into
                              a birthday story.
                            </p>
                            <button
                              className="button plum"
                              onClick={() => setAddOpen(true)}
                            >
                              <Plus size={16} />
                              Add your first person
                            </button>
                          </section>
                        )}
                        <section className="how-strip">
                          <div className="how-icon">
                            <Sparkles size={21} />
                          </div>
                          <div>
                            <strong>
                              You bring the memories. We’ll bring it together.
                            </strong>
                            <p>
                              Choose photos. Find your style. Make their day.
                            </p>
                          </div>
                          <button
                            className="circle-arrow"
                            aria-label="Learn how it works"
                            onClick={() =>
                              setInfo(
                                "1. Add a person and their birthday. 2. Import photos you choose. 3. Review the selection and edit captions. 4. Choose a style and preview your story. 5. Export a collage or video. Photos and drafts stay on this device.",
                              )
                            }
                          >
                            <ArrowUpRight size={19} />
                          </button>
                        </section>
                      </div>
                      <aside className="home-secondary">
                        <div className="section-title">
                          <h2>Coming up</h2>
                          <button
                            className="text-button"
                            onClick={() => navigate("Upcoming")}
                          >
                            View all <ArrowUpRight size={14} />
                          </button>
                        </div>
                        <div className="upcoming-card">
                          {ordered.slice(0, 3).map((p) => (
                            <button
                              className="person-row"
                              key={p.id}
                              onClick={() => openPerson(p)}
                            >
                              <Avatar person={p} />
                              <div>
                                <strong>{p.name}</strong>
                                <span>
                                  {p.relation}{" "}
                                  <span className="mid-dot">·</span>{" "}
                                  {birthdayLabel(p.birthday)}
                                </span>
                              </div>
                              <span
                                className={`days-badge ${daysUntil(p.birthday) < 7 ? "soon" : ""}`}
                              >
                                {daysUntil(p.birthday) === 0
                                  ? "Today"
                                  : `${daysUntil(p.birthday)} days`}
                              </span>
                            </button>
                          ))}
                          <button
                            className="add-person-row"
                            onClick={() => setAddOpen(true)}
                          >
                            <span>
                              <Plus size={16} />
                            </span>
                            Someone worth celebrating
                          </button>
                        </div>
                        <section className="thought-card">
                          <span className="thought-kicker">
                            A SMALL REMINDER
                          </span>
                          <div className="drawn-heart">♡</div>
                          <h3>
                            The best gifts
                            <br />
                            aren’t <em>things.</em>
                          </h3>
                          <p>
                            They’re the moments that say,
                            <br />
                            “I’m so glad you’re in my life.”
                          </p>
                          <span className="handwritten">
                            Make something that matters.
                          </span>
                          <span className="thought-spark">✧</span>
                        </section>
                      </aside>
                    </div>
                    <section className="memories-section">
                      <div className="section-title">
                        <div>
                          <h2>A little inspiration</h2>
                          <p>Different moods. The same thoughtfulness.</p>
                        </div>
                        <span className="editorial-note">
                          Made for your kind of love <span>↙</span>
                        </span>
                      </div>
                      <div className="style-grid">
                        {[
                          {
                            tone: "Emotional",
                            label: "For all the feels",
                            image: "family",
                            note: "Soft moments. Big feelings.",
                            cls: "emotional",
                          },
                          {
                            tone: "Funny",
                            label: "For your favorite chaos",
                            image: "friends",
                            note: "Good times. Questionable decisions.",
                            cls: "funny",
                          },
                          {
                            tone: "Elegant",
                            label: "Less, but more meaningful",
                            image: "couple",
                            note: "A little understated. Entirely personal.",
                            cls: "elegant",
                          },
                          {
                            tone: "Timeline",
                            label: "Look how far you’ve come",
                            image: "family",
                            note: "Your story, one memory at a time.",
                            cls: "timeline",
                          },
                        ].map((s) => (
                          <button
                            className={`style-card ${s.cls}`}
                            key={s.tone}
                            onClick={() => {
                              if (next) {
                                update((st) => ({
                                  ...st,
                                  people: st.people.map((p) =>
                                    p.id === next.id
                                      ? { ...p, tone: s.tone }
                                      : p,
                                  ),
                                }));
                                openPerson(next, "studio");
                              } else setAddOpen(true);
                            }}
                          >
                            <div className="style-image">
                              <img
                                src={`/photos/${s.image}.jpg`}
                                alt="Sample memory story style"
                              />
                              <div className="style-overlay" />
                              <span className="style-tag">{s.tone}</span>
                              <span className="style-sample">{s.label}</span>
                              <span className="style-play">
                                <Play size={14} fill="currentColor" />
                              </span>
                            </div>
                            <div className="style-meta">
                              <span>{s.note}</span>
                              <ArrowUpRight size={15} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                    <div className="home-footer">
                      <span>
                        <LockKeyhole size={13} />
                        Your memories are yours. Always.
                      </span>
                      <span>MADE FOR THE PEOPLE WHO MATTER</span>
                    </div>
                  </>
                )}
                {!flow && (page === "People" || page === "Upcoming") && (
                  <>
                    <div className="page-heading">
                      <div>
                        <div className="eyebrow">
                          {page === "People"
                            ? "YOUR INNER CIRCLE"
                            : "GOOD DAYS AHEAD"}
                        </div>
                        <h1>
                          {page === "People" ? (
                            <>
                              Your favorite <em>people.</em>
                            </>
                          ) : (
                            <>
                              Something to <em>look forward to.</em>
                            </>
                          )}
                        </h1>
                        <p>
                          {page === "People"
                            ? "Every person, a whole world of memories."
                            : "A little head start on making their day."}
                        </p>
                      </div>
                      <button
                        className="button plum"
                        onClick={() => setAddOpen(true)}
                      >
                        <Plus size={17} />
                        Add someone
                      </button>
                    </div>
                    <div className="search-box">
                      <Search size={18} />
                      <input
                        aria-label="Find a person"
                        placeholder="Find someone special…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <div className="people-grid">
                      {(page === "Upcoming" ? ordered : state.people)
                        .filter((p) =>
                          p.name.toLowerCase().includes(query.toLowerCase()),
                        )
                        .map((p) => (
                          <article className="person-card" key={p.id}>
                            <div className="person-card-top">
                              <span className="soft-tag">
                                {p.demo ? "Sample person" : p.relation}
                              </span>
                              <span className="days-badge soon">
                                {daysUntil(p.birthday) === 0
                                  ? "Today"
                                  : `${daysUntil(p.birthday)} days to go`}
                              </span>
                            </div>
                            <Avatar person={p} large />
                            <h2>{p.name}</h2>
                            <p>
                              {p.relation} · {birthdayLabel(p.birthday)}
                            </p>
                            <div className="person-card-stat">
                              <Images size={15} />
                              {
                                state.photos.filter(
                                  (ph) => ph.personId === p.id,
                                ).length
                              }{" "}
                              memories <span>·</span>{" "}
                              {
                                state.stories.filter((s) => s.personId === p.id)
                                  .length
                              }{" "}
                              stories
                            </div>
                            <button
                              className="button plum full"
                              onClick={() => openPerson(p)}
                            >
                              Make their day <ArrowRight size={16} />
                            </button>
                            <button
                              className="text-button center"
                              onClick={() => setEditing(p)}
                            >
                              Edit person <SlidersHorizontal size={13} />
                            </button>
                          </article>
                        ))}
                      <button
                        className="person-add-card"
                        onClick={() => setAddOpen(true)}
                      >
                        <span>
                          <Plus size={24} />
                        </span>
                        <h3>There’s always someone.</h3>
                        <p>Add a person worth celebrating.</p>
                      </button>
                    </div>
                  </>
                )}
                {!flow && page === "Memories" && (
                  <>
                    <div className="page-heading">
                      <div>
                        <div className="eyebrow">LITTLE TIME CAPSULES</div>
                        <h1>
                          Made to <em>be kept.</em>
                        </h1>
                        <p>Your stories, saved for another smile.</p>
                      </div>
                      <button
                        className="button plum"
                        onClick={() =>
                          next ? openPerson(next) : setAddOpen(true)
                        }
                      >
                        <Plus size={17} />
                        Create a story
                      </button>
                    </div>
                    {state.stories.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-illustration">
                          <Images size={44} strokeWidth={1} />
                          <Heart size={21} />
                        </div>
                        <h2>Your next favorite memory starts here.</h2>
                        <p>
                          Stories you create will live here, ready to revisit.
                          <br />
                          Let’s make the first one for someone special.
                        </p>
                        <button
                          className="button plum"
                          onClick={() =>
                            next ? openPerson(next) : setAddOpen(true)
                          }
                        >
                          Create your first story <ArrowRight size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="people-grid">
                        {state.stories.map((s) => {
                          const p = state.people.find(
                            (p) => p.id === s.personId,
                          );
                          if (!p) return null;
                          return (
                            <article className="saved-story" key={s.id}>
                              <img
                                src={
                                  state.photos.find((ph) =>
                                    s.photoIds.includes(ph.id),
                                  )?.src || "/photos/family.jpg"
                                }
                                alt={s.title}
                              />
                              <div>
                                <span className="eyebrow">
                                  {s.tone} · {s.duration}s
                                </span>
                                <h2>{s.title}</h2>
                                <p>
                                  {new Date(s.created).toLocaleDateString()}
                                </p>
                                <button
                                  className="button plum"
                                  onClick={() => openPerson(p, "studio")}
                                >
                                  Open story <ArrowUpRight size={16} />
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                {!flow && page === "Settings" && (
                  <>
                    <div className="page-heading">
                      <div>
                        <div className="eyebrow">PEACE OF MIND, INCLUDED</div>
                        <h1>
                          Your space.<em> Your rules.</em>
                        </h1>
                        <p>A few thoughtful defaults. Full control.</p>
                      </div>
                    </div>
                    <div className="settings-layout">
                      <section className="settings-card">
                        <ShieldCheck size={27} />
                        <h2>Your memories stay here.</h2>
                        <p>
                          Imported photos, people, and drafts are saved on this
                          device. This build sends no photos to a server.
                          Imported photos are resized to a maximum of 1,600
                          pixels; your originals are untouched.
                        </p>
                        <div className="setting-row">
                          <span>
                            Cloud photo processing
                            <small>No cloud services connected</small>
                          </span>
                          <span className="soft-tag">Off</span>
                        </div>
                        <div className="setting-row">
                          <span>
                            Automatic sharing
                            <small>
                              Every export starts with your approval
                            </small>
                          </span>
                          <span className="soft-tag">Off</span>
                        </div>
                        <div className="setting-row">
                          <span>
                            Birthday preparation
                            <small>
                              Highlights upcoming birthdays when you open the
                              app
                            </small>
                          </span>
                          <select
                            aria-label="Birthday preparation lead time"
                            value={state.reminderDays}
                            onChange={(e) =>
                              update((s) => ({
                                ...s,
                                reminderDays: +e.target.value,
                              }))
                            }
                          >
                            <option value="3">3 days before</option>
                            <option value="7">7 days before</option>
                            <option value="14">14 days before</option>
                          </select>
                        </div>
                        <p className="fine-print">
                          Scheduled notifications and background preparation are
                          not enabled yet. Keep a copy of exports: browser data
                          can be cleared by your device.
                        </p>
                      </section>
                      <section className="settings-card">
                        <Images size={27} />
                        <h2>A fresh start.</h2>
                        <p>
                          Explore with samples, or make this space entirely
                          yours.
                        </p>
                        <button
                          className="button outline full"
                          onClick={() => {
                            update((s) => ({
                              ...s,
                              people: s.people.filter((p) => !p.demo),
                              photos: s.photos.filter((p) => !p.demo),
                              stories: s.stories.filter((st) =>
                                s.people.some(
                                  (p) => p.id === st.personId && !p.demo,
                                ),
                              ),
                            }));
                            setToast("Sample people and memories removed.");
                          }}
                        >
                          Remove sample content
                        </button>
                        <button
                          className="button outline full"
                          onClick={() => {
                            const blob = new Blob(
                              [JSON.stringify(state, null, 2)],
                              { type: "application/json" },
                            );
                            saveExport(blob, "keepsake-backup.json").catch(() =>
                              setToast("Backup could not be saved."),
                            );
                          }}
                        >
                          Download a private backup <Download size={16} />
                        </button>
                        <p className="fine-print">
                          Backups include your imported photos. Store them
                          somewhere private.
                        </p>
                        <button
                          className="text-button danger"
                          onClick={() => setInfo("delete-all")}
                        >
                          Erase all local data
                        </button>
                      </section>
                    </div>
                  </>
                )}
                {flow && person && (
                  <CelebrationFlow
                    key={person.id}
                    person={person}
                    photos={state.photos.filter(
                      (p) => p.personId === person.id,
                    )}
                    story={state.stories.find((s) => s.personId === person.id)}
                    flow={flow}
                    setFlow={setFlow}
                    onBack={() => setFlow(undefined)}
                    onImport={() => input.current?.click()}
                    update={update}
                    notify={setToast}
                    info={setInfo}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name && !flow ? "selected" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={21} />
              <span>{name}</span>
            </button>
          ))}
          <button
            className={page === "Settings" ? "selected" : ""}
            onClick={() => navigate("Settings")}
          >
            <Settings size={21} />
            <span>Settings</span>
          </button>
        </nav>
        <input
          hidden
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => importFiles(e.target.files)}
        />
        <AnimatePresence>
          {editing && (
            <Modal
              title={`A little update for ${editing.name}.`}
              onClose={() => setEditing(undefined)}
            >
              <AddPerson
                initial={editing}
                onSave={(person) => {
                  update((s) => ({
                    ...s,
                    people: s.people.map((p) =>
                      p.id === person.id ? person : p,
                    ),
                  }));
                  setEditing(undefined);
                  setToast("Their details are saved.");
                }}
                onRemove={() => {
                  const id = editing.id;
                  update((s) => ({
                    ...s,
                    people: s.people.filter((p) => p.id !== id),
                    photos: s.photos.filter((p) => p.personId !== id),
                    stories: s.stories.filter((p) => p.personId !== id),
                  }));
                  setEditing(undefined);
                  setToast(
                    "Person and local memories removed. Original files are untouched.",
                  );
                }}
              />
            </Modal>
          )}
          {addOpen && (
            <Modal
              title="Someone worth celebrating."
              subtitle="Save their birthday once. Let the good memories begin."
              onClose={() => setAddOpen(false)}
            >
              <AddPerson
                onSave={(p) => {
                  update((s) => ({
                    ...s,
                    people: [...s.people, p],
                    onboarded: true,
                  }));
                  setAddOpen(false);
                  openPerson(p);
                  setToast(`${p.name} is in your circle.`);
                }}
              />
            </Modal>
          )}
          {info && (
            <Modal
              title={
                info === "delete-all"
                  ? "Erase this private space?"
                  : "A little peace of mind."
              }
              onClose={() => setInfo("")}
            >
              {info === "delete-all" ? (
                <>
                  <p>
                    This removes all people, imported photos, and story drafts
                    from this device. Your original photos and exported files
                    are unaffected.
                  </p>
                  <div className="modal-actions">
                    <button
                      className="button outline"
                      onClick={() => setInfo("")}
                    >
                      Keep my memories
                    </button>
                    <button
                      className="button danger-fill"
                      onClick={() => {
                        update((s) => ({
                          ...s,
                          people: [],
                          photos: [],
                          stories: [],
                        }));
                        setInfo("");
                        setToast("Local people, photos, and drafts erased.");
                      }}
                    >
                      Erase local data
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="info-copy">{info}</p>
                  <button
                    className="button plum full"
                    onClick={() => setInfo("")}
                  >
                    Got it <Check size={16} />
                  </button>
                </>
              )}
            </Modal>
          )}
        </AnimatePresence>
        {busy && (
          <div className="busy-overlay" role="status">
            <LoaderCircle size={30} className="spin" />
            <h3>{busy}</h3>
            <p>Your photos stay on this device.</p>
          </div>
        )}
        <AnimatePresence>
          {toast && (
            <motion.div
              role="status"
              className="toast"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 25 }}
            >
              <Check size={17} />
              {toast}
              <button
                aria-label="Dismiss notification"
                onClick={() => setToast("")}
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-star">✳</span>
      <span>
        keepsake<span className="brand-period">.</span>
      </span>
    </div>
  );
}
function Avatar({
  person,
  large = false,
}: {
  person: Person;
  large?: boolean;
}) {
  return (
    <span className={`person-avatar ${large ? "large" : ""}`}>
      {person.avatar ? (
        <img src={person.avatar} alt="" />
      ) : (
        person.name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("input,button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const all = [
          ...el.querySelectorAll<HTMLElement>(
            'button,input,select,textarea,[tabindex="0"]',
          ),
        ].filter((x) => !x.hasAttribute("disabled"));
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);
  return (
    <motion.div
      className="modal-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={21} />
        </button>
        <div className="modal-spark">
          <Sparkles size={25} />
        </div>
        <h2 id="modal-title">{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </motion.div>
    </motion.div>
  );
}
function AddPerson({
  onSave,
  initial,
  onRemove,
}: {
  onSave: (p: Person) => void;
  initial?: Person;
  onRemove?: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [relation, setRelation] = useState(initial?.relation || "Best friend");
  const [birthday, setBirthday] = useState(initial?.birthday || "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !birthday) return;
        onSave({
          ...initial,
          id: initial?.id || uid(),
          name: name.trim(),
          relation,
          birthday,
          tone: initial?.tone || "Emotional",
        });
      }}
    >
      <label>
        Their name
        <input
          required
          autoComplete="off"
          maxLength={40}
          placeholder="What do you call them?"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="form-two">
        <label>
          Your relationship
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          >
            {[
              "Best friend",
              "Partner",
              "Parent",
              "Sibling",
              "Child",
              "Family",
              "Friend",
              "Someone special",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Birthday
          <input
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </label>
      </div>
      <p className="privacy-inline">
        <LockKeyhole size={14} />
        Only saved on this device.
      </p>
      <button className="button plum full" type="submit">
        {initial ? "Save details" : "Add to my people"} <ArrowRight size={17} />
      </button>
      {onRemove && (
        <details className="remove-person">
          <summary>Remove this person</summary>
          <p>
            This erases their local photos and drafts. Your original files and
            exported stories stay untouched.
          </p>
          <button
            type="button"
            className="button danger-fill full"
            onClick={onRemove}
          >
            Remove person and local drafts
          </button>
        </details>
      )}
    </form>
  );
}

type FlowProps = {
  person: Person;
  photos: Photo[];
  story?: Story;
  flow: Flow;
  setFlow: (s: Flow) => void;
  onBack: () => void;
  onImport: () => void;
  update: (fn: (s: State) => State) => void;
  notify: (s: string) => void;
  info: (s: string) => void;
};
function CelebrationFlow({
  person,
  photos,
  story,
  flow,
  setFlow,
  onBack,
  onImport,
  update,
  notify,
  info,
}: FlowProps) {
  const [filter, setFilter] = useState("All photos");
  const [tone, setTone] = useState(story?.tone || person.tone);
  const [duration, setDuration] = useState(story?.duration || 30);
  const [format, setFormat] = useState(story?.format || "Story");
  const [closing, setClosing] = useState(
    story?.closing ||
      `Happy birthday, ${person.name}. Here’s to more moments like these.`,
  );
  const [playing, setPlaying] = useState(false);
  const [slide, setSlide] = useState(0);
  const [kind, setKind] = useState("Collage");
  const [progress, setProgress] = useState<number>();
  const [exportBlob, setExportBlob] = useState<Blob>();
  const [exportError, setExportError] = useState("");
  const abort = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => abort.current?.abort(), []);
  const selected = photos.filter((p) => p.selected);
  const activePhoto = selected[slide % Math.max(selected.length, 1)];
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () => setSlide((s) => (s + 1) % Math.max(selected.length, 1)),
      (duration * 1000) / Math.max(selected.length, 1),
    );
    return () => clearInterval(t);
  }, [playing, selected.length, duration]);
  function patchPhoto(id: string, values: Partial<Photo>) {
    update((s) => ({
      ...s,
      photos: s.photos.map((p) => (p.id === id ? { ...p, ...values } : p)),
    }));
    setExportBlob(undefined);
  }
  function movePhoto(direction: number) {
    const current = slide % Math.max(selected.length, 1),
      next = current + direction;
    if (next < 0 || next >= selected.length) return;
    update((s) => {
      const ordered = [...s.photos],
        a = ordered.findIndex((p) => p.id === selected[current].id),
        b = ordered.findIndex((p) => p.id === selected[next].id);
      [ordered[a], ordered[b]] = [ordered[b], ordered[a]];
      return { ...s, photos: ordered };
    });
    setSlide(next);
    setExportBlob(undefined);
  }
  function saveDraft() {
    const draft: Story = {
      id: story?.id || uid(),
      personId: person.id,
      title: `For ${person.name}, with love`,
      tone,
      duration,
      format,
      photoIds: selected.map((p) => p.id),
      created: story?.created || new Date().toISOString(),
      closing,
    };
    update((s) => ({
      ...s,
      stories: [draft, ...s.stories.filter((st) => st.personId !== person.id)],
    }));
    return draft;
  }
  function changeTone(t: string) {
    setTone(t);
    update((s) => ({
      ...s,
      photos: s.photos.map((p, i) =>
        p.personId === person.id && p.selected
          ? { ...p, caption: captionFor(t, i, person.name) }
          : p,
      ),
    }));
    setExportBlob(undefined);
  }
  async function generate() {
    setExportError("");
    setProgress(0);
    setExportBlob(undefined);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const draft = saveDraft();
      const blob =
        kind === "Collage"
          ? await makeCollage(person, selected, format, closing)
          : await makeVideo(
              person,
              selected,
              draft,
              setProgress,
              controller.signal,
            );
      if (!controller.signal.aborted) {
        setExportBlob(blob);
        notify("Your celebration is ready to save.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setExportError(
          (e as Error).message ||
            "Export failed. Your draft is safe. Please retry.",
        );
    } finally {
      setProgress(undefined);
    }
  }
  const filtered = photos.filter((p) =>
    filter === "Selected"
      ? p.selected
      : filter === "Needs review"
        ? !p.selected || p.reason
        : true,
  );
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to your space
      </button>
      <div className="flow-heading">
        <div>
          <div className="eyebrow">
            {birthdayLabel(person.birthday)} · {person.relation}
            {person.demo ? " · SAMPLE PERSON" : ""}
          </div>
          <h1>
            A little love for <em>{person.name}.</em>
          </h1>
          <p>
            {flow === "review"
              ? "Every story starts with a few good memories."
              : flow === "studio"
                ? "Your memories. A little creative magic."
                : "One last look. Then make their day."}
          </p>
        </div>
        <Avatar person={person} />
      </div>
      <div className="steps">
        {[
          { label: "Choose memories", stage: "review" },
          { label: "Make it yours", stage: "studio" },
          { label: "Review & export", stage: "export" },
        ].map((s, i) => (
          <button
            className={flow === s.stage ? "current" : ""}
            key={s.stage}
            disabled={
              s.stage !== "review" && !selected.length && photos.length > 0
            }
            onClick={() => {
              saveDraft();
              setFlow(s.stage as Flow);
            }}
          >
            <span>{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>
      {flow === "review" && (
        <>
          <div className="review-toolbar">
            <div className="tabs">
              {["All photos", "Selected", "Needs review"].map((t) => (
                <button
                  className={filter === t ? "active" : ""}
                  key={t}
                  onClick={() => setFilter(t)}
                >
                  {t}
                  {t === "Selected" && <span>{selected.length}</span>}
                </button>
              ))}
            </div>
            <button className="button outline" onClick={onImport}>
              <ImagePlus size={17} />
              Add photos
            </button>
          </div>
          <div className="privacy-banner">
            <ShieldCheck size={20} />
            <div>
              <strong>A private selection, made by you.</strong>
              <span>
                Choose photos of {person.name}. Exact duplicates and
                low-resolution images are flagged locally. Face matching and
                sensitive-photo detection are not enabled.
              </span>
            </div>
          </div>
          {photos.some((p) => p.demo) && (
            <p className="sample-note">
              Sample photos demonstrate the design; they are not identity
              matches. Add your own memories to make this personal.
            </p>
          )}
          {photos.length === 0 ? (
            <div className="upload-zone">
              <ImagePlus size={39} strokeWidth={1} />
              <h2>A whole story, waiting in your camera roll.</h2>
              <p>
                Choose a few photos of {person.name} to start.
                <br />
                Only the files you select are accessed.
              </p>
              <button className="button plum" onClick={onImport}>
                <Upload size={17} />
                Choose photos
              </button>
              <button
                className="text-button center"
                onClick={() => setFlow("studio")}
              >
                Start with a personal birthday card <ArrowRight size={14} />
              </button>
              <span>JPG, PNG, WebP · Up to 100 photos per import</span>
            </div>
          ) : (
            <>
              <div className="selection-summary">
                <span>
                  {selected.length} of {photos.length} memories selected
                </span>
                <button
                  className="text-button"
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      photos: s.photos.map((p) =>
                        p.personId === person.id && !p.reason
                          ? { ...p, selected: true }
                          : p,
                      ),
                    }))
                  }
                >
                  <CheckCheck size={16} />
                  Select unflagged
                </button>
              </div>
              <div className="photo-grid">
                {filtered.map((p) => (
                  <div
                    className={`photo-tile ${p.selected ? "chosen" : ""}`}
                    key={p.id}
                  >
                    <button
                      className="photo-select"
                      aria-label={`${p.selected ? "Deselect" : "Select"} ${p.name}`}
                      aria-pressed={p.selected}
                      onClick={() =>
                        patchPhoto(p.id, { selected: !p.selected })
                      }
                    >
                      <img src={p.src} alt={p.name} />
                      <span className="photo-check">
                        {p.selected && <Check size={16} />}
                      </span>
                      {p.reason && (
                        <span className="photo-flag">{p.reason}</span>
                      )}
                    </button>
                    <div className="photo-caption">
                      <span>{p.name}</span>
                      <button
                        aria-label={`Remove ${p.name} from project`}
                        onClick={() => {
                          update((s) => ({
                            ...s,
                            photos: s.photos.filter((ph) => ph.id !== p.id),
                          }));
                          notify(
                            "Removed from this project. Your original is untouched.",
                          );
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="empty-inline">No photos in this view yet.</div>
              )}
            </>
          )}
          <div className="flow-bottom">
            <div>
              <strong>
                {selected.length
                  ? `${selected.length} memories, one thoughtful story`
                  : "A few memories go a long way"}
              </strong>
              <span>
                {selected.length < 4
                  ? "Even a small collection can make something beautiful."
                  : "Choose the ones that feel most like them."}
              </span>
            </div>
            <button
              className="button plum"
              disabled={!selected.length && photos.length > 0}
              onClick={() => {
                if (selected.some((p) => !p.caption)) changeTone(tone);
                saveDraft();
                setFlow("studio");
              }}
            >
              Make a little magic <Sparkles size={17} />
            </button>
          </div>
          <button
            className="contribution-note"
            onClick={() =>
              info(
                "Private contribution links are planned for a connected release. This local build cannot create a secure shared link yet. For now, ask friends to send photos directly to you, then add the files here.",
              )
            }
          >
            <Users size={18} />
            <span>
              Missing a few memories?{" "}
              <strong>Bring your people together.</strong>
            </span>
            <ArrowUpRight size={16} />
          </button>
        </>
      )}
      {flow === "studio" && (
        <div className="studio-layout">
          <div className="preview-area">
            <div
              className={`story-preview ${tone.toLowerCase()} format-${format.toLowerCase()}`}
            >
              {activePhoto ? (
                <img
                  key={activePhoto.id}
                  src={activePhoto.src}
                  alt={activePhoto.name}
                />
              ) : (
                <div className="text-preview-bg" />
              )}
              <div className="preview-gradient" />
              <div className="preview-top-label">
                A LITTLE SOMETHING, JUST FOR YOU
              </div>
              <div className="preview-title">
                For {person.name},<br />
                <em>with love.</em>
              </div>
              <span className="preview-spark">✧</span>
              <div className="preview-caption">
                {activePhoto?.caption || closing}
              </div>
              <span className="preview-bottom">
                HAPPY BIRTHDAY <Heart size={12} />
              </span>
              <button
                className="preview-play"
                aria-label={playing ? "Pause preview" : "Play preview"}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? (
                  <Pause fill="currentColor" size={18} />
                ) : (
                  <Play fill="currentColor" size={18} />
                )}
              </button>
            </div>
            <div className="preview-controls">
              <button
                className="icon-button"
                aria-label="Previous photo"
                disabled={!selected.length}
                onClick={() =>
                  setSlide((s) => (s + selected.length - 1) % selected.length)
                }
              >
                <ChevronLeft size={20} />
              </button>
              <span>
                {selected.length ? (slide % selected.length) + 1 : 0} /{" "}
                {selected.length} memories
              </span>
              <button
                className="icon-button"
                aria-label="Next photo"
                disabled={!selected.length}
                onClick={() => setSlide((s) => (s + 1) % selected.length)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <p className="fine-print">
              <VolumeX size={13} />
              This first build exports silent video. Add a licensed soundtrack
              in your sharing app.
            </p>
          </div>
          <div className="studio-settings">
            <div className="panel-label">
              <SlidersHorizontal size={17} />
              THE FINISHING TOUCHES
            </div>
            <h2>
              Make it feel <em>like them.</em>
            </h2>
            <label>Find your mood</label>
            <div className="tone-options">
              {tones.map((t) => (
                <button
                  key={t}
                  className={tone === t ? "selected" : ""}
                  onClick={() => changeTone(t)}
                >
                  <span>
                    {t === "Emotional"
                      ? "♡"
                      : t === "Funny"
                        ? "☺"
                        : t === "Elegant"
                          ? "✧"
                          : "◷"}
                  </span>
                  {t}
                  {tone === t && <Check size={14} />}
                </button>
              ))}
            </div>
            <p className="fine-print">
              Changing mood replaces the current photo captions with suggested
              lines.
            </p>
            <label>
              Story format
              <div className="format-options">
                {["Story", "Square", "Feed", "Landscape"].map((f) => (
                  <button
                    className={format === f ? "selected" : ""}
                    key={f}
                    aria-label={`${f} format`}
                    aria-pressed={format === f}
                    onClick={() => {
                      setFormat(f);
                      setExportBlob(undefined);
                    }}
                  >
                    <span className={`format-icon ${f.toLowerCase()}`} />
                    {f}
                    <small>
                      {f === "Story"
                        ? "9:16"
                        : f === "Square"
                          ? "1:1"
                          : f === "Feed"
                            ? "4:5"
                            : "16:9"}
                    </small>
                  </button>
                ))}
              </div>
            </label>
            <label>
              Video length
              <select
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              >
                <option value="30">30 seconds · Short & sweet</option>
                <option value="45">45 seconds · A little more love</option>
                <option value="60">60 seconds · The whole feeling</option>
              </select>
            </label>
            {activePhoto && (
              <label>
                This memory’s caption
                <textarea
                  rows={2}
                  maxLength={150}
                  value={activePhoto.caption}
                  onChange={(e) =>
                    patchPhoto(activePhoto.id, { caption: e.target.value })
                  }
                />
              </label>
            )}
            {activePhoto && (
              <div className="sequence-controls">
                <button
                  className="button outline"
                  disabled={slide % selected.length === 0}
                  onClick={() => movePhoto(-1)}
                >
                  <ArrowLeft size={14} />
                  Move earlier
                </button>
                <button
                  className="button outline"
                  disabled={slide % selected.length === selected.length - 1}
                  onClick={() => movePhoto(1)}
                >
                  Move later <ArrowRight size={14} />
                </button>
              </div>
            )}
            <label>
              Your closing message
              <textarea
                rows={3}
                maxLength={200}
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
              />
            </label>
            <div className="studio-actions">
              <button
                className="button outline"
                onClick={() => {
                  saveDraft();
                  notify("Your story draft is saved on this device.");
                }}
              >
                Save draft
              </button>
              <button
                className="button plum"
                disabled={!selected.length && photos.length > 0}
                onClick={() => {
                  saveDraft();
                  setPlaying(false);
                  setFlow("export");
                }}
              >
                Review story <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
      {flow === "export" && (
        <div className="export-layout">
          <div className="export-art">
            <div className="export-polaroid">
              {selected[0] ? (
                <img
                  src={selected[0].src}
                  alt="First memory in your celebration"
                />
              ) : (
                <div />
              )}
              <span>For {person.name}, with love. ♡</span>
            </div>
            <span className="export-spark">✧</span>
            <h2>
              A little something.
              <br />
              <em>A whole lot of heart.</em>
            </h2>
            <p>Take one last look. This is yours to share.</p>
          </div>
          <section className="export-panel">
            <div className="panel-label">
              <CheckCheck size={17} />
              YOUR FINAL REVIEW
            </div>
            <h2>Ready to make their day?</h2>
            <div className="export-details">
              <div>
                <span>Made for</span>
                <strong>{person.name}</strong>
              </div>
              <div>
                <span>Memories</span>
                <strong>{selected.length} selected</strong>
              </div>
              <div>
                <span>Mood</span>
                <strong>{tone}</strong>
              </div>
              <div>
                <span>Format</span>
                <strong>
                  {format} ·{" "}
                  {format === "Story"
                    ? "9:16"
                    : format === "Square"
                      ? "1:1"
                      : format === "Feed"
                        ? "4:5"
                        : "16:9"}
                </strong>
              </div>
              <div>
                <span>Video</span>
                <strong>{duration}s · Silent</strong>
              </div>
            </div>
            <label>What would you like to make?</label>
            <div className="export-kinds">
              {["Collage", "Video"].map((k) => (
                <button
                  key={k}
                  disabled={progress !== undefined}
                  className={kind === k ? "selected" : ""}
                  onClick={() => {
                    setKind(k);
                    setExportBlob(undefined);
                  }}
                >
                  {k === "Collage" ? <Images size={19} /> : <Film size={19} />}
                  <span>
                    {k}
                    <small>
                      {k === "Collage"
                        ? "A beautiful keepsake image"
                        : "A birthday memory film"}
                    </small>
                  </span>
                  {kind === k && <Check size={16} />}
                </button>
              ))}
            </div>
            {kind === "Collage" && (
              <p className="fine-print">
                Your collage includes the first four selected memories. Video
                includes all selected photos.
              </p>
            )}
            {kind === "Video" && (
              <p className="fine-print">
                Video records in real time. Keep this screen open for {duration}{" "}
                seconds. MP4 when supported; otherwise WebM. Photos use a
                centered crop.
              </p>
            )}
            <div className="export-privacy">
              <LockKeyhole size={16} />
              <span>
                Nothing is shared automatically. Save a copy or choose who
                receives it.
              </span>
            </div>
            {exportError && (
              <p role="alert" className="error-text">
                {exportError}
              </p>
            )}
            {progress !== undefined ? (
              <div className="render-progress" role="status">
                <span>
                  <LoaderCircle size={16} className="spin" />
                  Putting your memories together… {Math.round(progress * 100)}%
                </span>
                <progress value={progress} max={1} />
                <button
                  className="text-button"
                  onClick={() => abort.current?.abort()}
                >
                  Cancel export
                </button>
              </div>
            ) : exportBlob ? (
              <>
                <div className="export-ready">
                  <Check size={18} />
                  Ready · {(exportBlob.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                  {exportBlob.type.split("/")[1].toUpperCase()}
                </div>
                <button
                  className="button plum full"
                  onClick={() =>
                    saveExport(
                      exportBlob,
                      `for-${person.name.replace(/[^a-z0-9]/gi, "-")}.${exportBlob.type === "image/png" ? "png" : exportBlob.type === "video/mp4" ? "mp4" : "webm"}`,
                    )
                      .then(() =>
                        notify(
                          "Your file is ready. Check your downloads or share sheet.",
                        ),
                      )
                      .catch((e) =>
                        notify(
                          e.name === "AbortError"
                            ? "Sharing cancelled. Your export is still ready."
                            : "Could not save the file. Please retry.",
                        ),
                      )
                  }
                >
                  <Download size={17} />
                  Save {kind.toLowerCase()}
                </button>
                <button
                  className="button outline full"
                  onClick={() =>
                    saveExport(
                      exportBlob,
                      `birthday.${exportBlob.type === "image/png" ? "png" : exportBlob.type === "video/mp4" ? "mp4" : "webm"}`,
                      true,
                    ).catch((e) =>
                      notify(
                        e.name === "AbortError"
                          ? "Sharing cancelled."
                          : "Sharing unavailable. Try saving the file.",
                      ),
                    )
                  }
                >
                  <Send size={16} />
                  Share with someone
                </button>
              </>
            ) : (
              <button
                className="button plum full"
                disabled={!selected.length && photos.length > 0}
                onClick={generate}
              >
                <Sparkles size={17} />
                Create {kind.toLowerCase()}
              </button>
            )}
            <button
              className="text-button center"
              disabled={progress !== undefined}
              onClick={() => {
                setExportBlob(undefined);
                setFlow("studio");
              }}
            >
              A little more editing <ArrowLeft size={14} />
            </button>
          </section>
        </div>
      )}
    </>
  );
}
