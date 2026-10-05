// The shell: four screens, and a setup checklist until the radar has what it
// needs to run.

import { useEffect, useState } from "react";
import { AppNav, reportLocation, type AppNavItem } from "@clawnify/app/client";
import { ago, api, type Overview, type Voice } from "./api";
import { History, Queue, Searches, Voices } from "./screens";
import { primaryClass } from "./ui";

type View = "queue" | "history" | "searches" | "voices";

const PATHS: Record<View, string> = { queue: "/", history: "/history", searches: "/searches", voices: "/voices" };

const TITLES: Record<View, [string, string]> = {
  queue: ["To answer", "Posts worth a comment, best first. You post; nothing goes out on its own."],
  history: ["History", "What you commented, and what you skipped and why."],
  searches: ["Searches", "What your agent looks for on each run."],
  voices: ["Voices", "Who comments: your company page and the people who speak for it."],
};

/**
 * Which screen an incoming path means. The dashboard deep-links into an app by
 * loading it at a path and restores that path on reload, so an app that always
 * boots to its home screen silently ignores both.
 */
function viewFromPath(): View {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return (Object.keys(PATHS) as View[]).find((v) => PATHS[v] === path) ?? "queue";
}

export function App() {
  const [view, setView] = useState<View>(viewFromPath);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [o, v] = await Promise.all([api.overview(), api.voices()]);
      setOverview(o);
      setVoices(v.voices);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  function go(next: View) {
    setView(next);
    reportLocation(PATHS[next]);
  }

  const nav: AppNavItem[] = [
    // Not `home`: a home item is hidden from the list, and this row's count of
    // waiting posts is the one number worth seeing from anywhere in the app.
    { id: "queue", label: "To answer", href: "/", icon: "inbox", color: "blue", count: overview?.waiting },
    { id: "history", label: "History", href: "/history", icon: "history", color: "green" },
    { id: "searches", label: "Searches", href: "/searches", icon: "search", color: "violet" },
    { id: "voices", label: "Voices", href: "/voices", icon: "users", color: "amber" },
  ];

  const setupDone = !!overview && (overview.active_searches > 0 || overview.last_run_at !== null);
  const [title, subtitle] = TITLES[view];

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppNav title="OpenRadar" icon="target" groups={[{ items: nav }]} active={view} onNavigate={(item) => go(item.id as View)} />

      <main className="min-w-0 flex-1 p-6 md:p-8">
        <div className="min-w-0">
          <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          {overview && view === "queue" && (
            <p className="mt-1 text-sm text-faint">
              Last run {ago(overview.last_run_at)} · <span className="tnum">{overview.commented_7d}</span> commented this week
            </p>
          )}
        </div>

        {error && <div className="mt-6 rounded-lg bg-danger-tint px-4 py-3 text-sm text-danger">{error}</div>}

        <div className="mt-6">
          {overview === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : view === "queue" && !setupDone ? (
            <Setup voices={voices.length} onGo={go} />
          ) : view === "queue" ? (
            <Queue voices={voices} onError={setError} onCount={(n) => setOverview((o) => (o ? { ...o, waiting: n } : o))} />
          ) : view === "history" ? (
            <History onError={setError} />
          ) : view === "searches" ? (
            <Searches onError={setError} onChanged={() => void refresh()} />
          ) : (
            <Voices voices={voices} onError={setError} onChanged={() => void refresh()} />
          )}
        </div>
      </main>
    </div>
  );
}

/** First run: a checklist with one step open, until the first search exists. */
function Setup({ voices, onGo }: { voices: number; onGo: (v: View) => void }) {
  const steps = [
    {
      done: voices > 0,
      title: "Say who comments",
      body: "Add your company page and each person who answers for it, so every suggestion says who should post it.",
      action: "Add voices",
      view: "voices" as View,
    },
    {
      done: false,
      title: "Tell it what to look for",
      body: "A few short searches, typed the way you would into LinkedIn. Each with a line on what a good find looks like.",
      action: "Add searches",
      view: "searches" as View,
    },
    {
      done: false,
      title: "Let your agent run it",
      body: "Ask your agent to run OpenRadar on a schedule. It searches, skips what you have seen, and queues the rest here with a drafted comment.",
      action: null,
      view: null,
    },
  ];
  const openIndex = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="card max-w-3xl p-6">
      <h2 className="text-[1.375rem] font-semibold tracking-[-0.01em]">
        Get set up · <span className="tnum">{doneCount} / {steps.length}</span> steps
      </h2>
      <ol className="mt-4 divide-y divide-border">
        {steps.map((s, i) => {
          const open = i === openIndex;
          return (
            <li key={s.title} className="flex gap-3 py-4">
              <span
                aria-hidden
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  s.done ? "bg-success-tint text-success" : "shadow-[inset_0_0_0_1px_var(--border)] text-faint"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${s.done ? "text-muted" : ""}`}>{s.title}</p>
                {open && (
                  <>
                    <p className="mt-1 text-sm text-muted">{s.body}</p>
                    {s.action && s.view && (
                      <button type="button" className={`${primaryClass} mt-3`} onClick={() => onGo(s.view!)}>
                        {s.action}
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
