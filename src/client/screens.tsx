// The four screens. Each loads its own data so a screen is correct when opened
// on its own, which is how the dashboard deep-links into an app.

import { useEffect, useState } from "react";
import { ago, api, type Post, type Search, type Status, type Voice } from "./api";
import { PostCard } from "./post";
import { Card, Confirm, Empty, Field, inputClass, Pill, primaryClass, quietClass } from "./ui";

type OnError = (message: string) => void;

export function Queue({ voices, onError, onCount }: { voices: Voice[]; onError: OnError; onCount: (n: number) => void }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  async function load(p: number) {
    try {
      const res = await api.posts("new", p);
      setPosts((prev) => (p === 1 ? res.posts : [...(prev ?? []), ...res.posts]));
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      onError((e as Error).message);
      setPosts([]);
    }
  }

  useEffect(() => {
    void load(1);
  }, []);
  useEffect(() => onCount(total), [total]);

  if (posts === null) return <p className="text-sm text-muted">Loading…</p>;
  // A card that is approved stays until the person says whether they posted it.
  const open = posts.filter((p) => p.status === "new" || p.status === "approved");
  if (!open.length)
    return (
      <Empty
        title="Nothing waiting"
        hint="Every post found so far has been answered or skipped. New ones appear here after your agent's next run."
      />
    );

  return (
    <div className="grid max-w-3xl grid-cols-1 gap-4">
      {open.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          voices={voices}
          onError={onError}
          onChange={(next) => {
            setPosts((list) => (list ?? []).map((x) => (x.id === next.id ? next : x)));
            if (next.status === "commented" || next.status === "dismissed") setTotal((t) => Math.max(0, t - 1));
          }}
        />
      ))}
      {posts.length < total && (
        <button type="button" className={`${quietClass} justify-self-start`} onClick={() => void load(page + 1)}>
          Show more
        </button>
      )}
    </div>
  );
}

export function History({ onError }: { onError: OnError }) {
  const [tab, setTab] = useState<Extract<Status, "commented" | "dismissed">>("commented");
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    setPosts(null);
    api
      .posts(tab)
      .then((r) => setPosts(r.posts))
      .catch((e: Error) => {
        onError(e.message);
        setPosts([]);
      });
  }, [tab]);

  async function reopen(p: Post) {
    try {
      await api.updatePost(p.id, { status: "new" });
      setPosts((list) => (list ?? []).filter((x) => x.id !== p.id));
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="grid max-w-3xl grid-cols-1 gap-4">
      <div className="flex gap-1" role="tablist">
        {(["commented", "dismissed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-sunken text-foreground" : "text-muted hover:text-foreground"}`}
            onClick={() => setTab(t)}
          >
            {t === "commented" ? "Commented" : "Skipped"}
          </button>
        ))}
      </div>
      {posts === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !posts.length ? (
        <Empty
          title={tab === "commented" ? "No comments yet" : "Nothing skipped"}
          hint={tab === "commented" ? "Posts you comment on land here, with what you actually wrote." : "Posts you skip land here, with the reason."}
        />
      ) : (
        <ul className="card divide-y divide-border">
          {posts.map((p) => (
            <li key={p.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                    {p.author_name || "Unknown author"}
                  </a>
                  <span className="text-faint">
                    {" "}
                    · {ago(p.decided_at)}
                    {p.decided_by ? ` by ${p.decided_by}` : ""}
                    {p.voice_name && tab === "commented" ? ` as ${p.voice_name}` : ""}
                  </span>
                </p>
                <p className="mt-1 line-clamp-3 text-sm text-muted">
                  {tab === "commented" ? p.final_comment || p.suggested_comment : p.dismiss_reason || "No reason given"}
                </p>
              </div>
              <button type="button" className={quietClass} onClick={() => void reopen(p)}>
                Reopen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Searches({ onError, onChanged }: { onError: OnError; onChanged: () => void }) {
  const [list, setList] = useState<Search[] | null>(null);
  const [draft, setDraft] = useState({ query: "", intent: "" });
  const [removing, setRemoving] = useState<Search | null>(null);

  const load = () =>
    api
      .searches()
      .then((r) => setList(r.searches))
      .catch((e: Error) => {
        onError(e.message);
        setList([]);
      });
  useEffect(() => {
    void load();
  }, []);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="grid max-w-3xl grid-cols-1 gap-5">
      <Card title="Add a search" hint="Write it the way you would type it into LinkedIn's search box. Short beats clever.">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.query.trim()) return;
            void act(async () => {
              await api.addSearch(draft);
              setDraft({ query: "", intent: "" });
            });
          }}
        >
          <Field label="Search for">
            <input className={inputClass} placeholder="bol.com specialist" value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} />
          </Field>
          <Field label="What you hope to find">
            <input
              className={inputClass}
              placeholder="Sellers asking who can help them on Bol"
              value={draft.intent}
              onChange={(e) => setDraft({ ...draft, intent: e.target.value })}
            />
          </Field>
          <button type="submit" className={primaryClass} disabled={!draft.query.trim()}>
            Add
          </button>
        </form>
      </Card>

      {list === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !list.length ? (
        <Empty title="No searches yet" hint="Add the first one above. Your agent runs every active search on its schedule." />
      ) : (
        <ul className="card divide-y divide-border">
          {list.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.query}</p>
                {s.intent && <p className="text-sm text-muted">{s.intent}</p>}
                <p className="mt-0.5 text-sm text-faint">
                  Last run {ago(s.last_run_at)}
                  {s.last_run_at ? ` · ${s.last_found} new` : ""}
                  {s.commented + s.skipped > 0 ? ` · ${s.commented} commented, ${s.skipped} skipped` : ""}
                </p>
              </div>
              {!s.active && <Pill tone="muted">Paused</Pill>}
              <button type="button" className={quietClass} onClick={() => void act(() => api.updateSearch(s.id, { active: !s.active }))}>
                {s.active ? "Pause" : "Resume"}
              </button>
              <button type="button" className={quietClass} onClick={() => setRemoving(s)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <Confirm
          title={`Delete “${removing.query}”?`}
          body="Posts it already found stay in your queue and history."
          confirmLabel="Delete search"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const s = removing;
            setRemoving(null);
            void act(() => api.deleteSearch(s.id));
          }}
        />
      )}
    </div>
  );
}

export function Voices({ voices, onError, onChanged }: { voices: Voice[]; onError: OnError; onChanged: () => void }) {
  const [draft, setDraft] = useState<{ name: string; kind: Voice["kind"]; notes: string }>({ name: "", kind: "person", notes: "" });
  const [removing, setRemoving] = useState<Voice | null>(null);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="grid max-w-3xl grid-cols-1 gap-5">
      <Card title="Add a voice" hint="Your company page, and each person who comments for it. Your agent suggests one per post.">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.name.trim()) return;
            void act(async () => {
              await api.addVoice(draft);
              setDraft({ name: "", kind: "person", notes: "" });
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Name">
              <input className={inputClass} placeholder="Our company page, or a person's name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Kind">
              <select className={inputClass} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Voice["kind"] })}>
                <option value="person">A person</option>
                <option value="company">Company page</option>
              </select>
            </Field>
          </div>
          <Field label="When to use it" hint="How this voice talks, and which posts suit it.">
            <input
              className={inputClass}
              placeholder="Founder. First person, practical, answers seller questions."
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
          <div>
            <button type="submit" className={primaryClass} disabled={!draft.name.trim()}>
              Add voice
            </button>
          </div>
        </form>
      </Card>

      {!voices.length ? (
        <Empty title="No voices yet" hint="Without one, suggestions say “Anyone”, and you pick who posts each time." />
      ) : (
        <ul className="card divide-y divide-border">
          {voices.map((v) => (
            <li key={v.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{v.name}</p>
                {v.notes && <p className="text-sm text-muted">{v.notes}</p>}
              </div>
              <Pill tone="muted">{v.kind === "company" ? "Company page" : "Person"}</Pill>
              <button type="button" className={quietClass} onClick={() => setRemoving(v)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <Confirm
          title={`Remove ${removing.name}?`}
          body="Suggestions that named this voice keep their text and switch to “Anyone”."
          confirmLabel="Remove voice"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const v = removing;
            setRemoving(null);
            void act(() => api.deleteVoice(v.id));
          }}
        />
      )}
    </div>
  );
}
