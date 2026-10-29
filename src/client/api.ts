// One fetch wrapper. Auth is the platform's job at the perimeter, so there is
// no token to attach and no login to build here.

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export type Status = "new" | "approved" | "commented" | "dismissed";

export interface Post {
  id: string;
  platform: string;
  url: string;
  author_name: string;
  author_headline: string;
  author_url: string | null;
  text: string;
  posted_at: string | null;
  found_at: string;
  search_id: string | null;
  search_query: string | null;
  language: string | null;
  relevance: number;
  reason: string;
  suggested_comment: string;
  original_comment: string;
  voice_id: string | null;
  voice_name: string | null;
  status: Status;
  dismiss_reason: string | null;
  final_comment: string | null;
  decided_by: string | null;
  decided_at: string | null;
}

export interface Search {
  id: string;
  query: string;
  platform: string;
  intent: string;
  active: boolean;
  last_run_at: string | null;
  last_found: number;
  commented: number;
  skipped: number;
  created_at: string;
}

export interface Voice {
  id: string;
  name: string;
  kind: "company" | "person";
  profile_url: string | null;
  notes: string;
  created_at: string;
}

export interface Overview {
  waiting: number;
  commented_7d: number;
  dismissed_7d: number;
  active_searches: number;
  last_run_at: string | null;
}

export interface RunSettings {
  server_id: string;
  time: string;
  weekdays_only: boolean;
  tz: string;
  enabled: boolean;
}

export interface RunSchedule {
  available: boolean;
  settings: (RunSettings & { scheduled: boolean; error: string | null }) | null;
  live: { next_run_at: string | null; last_run_at: string | null; last_status: string | null; last_error: string | null; running: boolean } | null;
  agents: { id: string; name: string | null; status: string | null }[];
}

export type PostPatch = Partial<Pick<Post, "status" | "suggested_comment" | "voice_id" | "final_comment" | "dismiss_reason">>;
export type SearchWrite = Partial<Pick<Search, "query" | "platform" | "intent" | "active">>;
export type VoiceWrite = Partial<Pick<Voice, "name" | "kind" | "profile_url" | "notes">>;

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  overview: () => request<Overview>("/api/overview"),

  posts: (status: Status, page = 1) =>
    request<{ posts: Post[]; total: number; page: number }>(`/api/posts?status=${status}&page=${page}&limit=25`),
  updatePost: (id: string, body: PostPatch) => request<Post>(`/api/posts/${id}`, json("PATCH", body)),

  searches: () => request<{ searches: Search[]; total: number }>("/api/searches?limit=100"),
  addSearch: (body: SearchWrite) => request<Search>("/api/searches", json("POST", body)),
  updateSearch: (id: string, body: SearchWrite) => request<Search>(`/api/searches/${id}`, json("PATCH", body)),
  deleteSearch: (id: string) => request<{ ok: boolean }>(`/api/searches/${id}`, { method: "DELETE" }),

  runSchedule: () => request<RunSchedule>("/api/run-schedule"),
  saveRunSchedule: (body: RunSettings) => request<{ ok: boolean }>("/api/run-schedule", json("PUT", body)),
  runNow: () => request<{ ok: boolean }>("/api/run-schedule/run", json("POST", { key: crypto.randomUUID() })),

  voices: () => request<{ voices: Voice[]; total: number }>("/api/voices?limit=100"),
  addVoice: (body: VoiceWrite) => request<Voice>("/api/voices", json("POST", body)),
  updateVoice: (id: string, body: VoiceWrite) => request<Voice>(`/api/voices/${id}`, json("PATCH", body)),
  deleteVoice: (id: string) => request<{ ok: boolean }>(`/api/voices/${id}`, { method: "DELETE" }),
};

/** "3h ago", "2d ago". Relative because the queue is about freshness. */
export function ago(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
