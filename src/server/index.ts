// OpenPostRadar: the API.
//
// `createApp` brings the OpenAPI router, the per-request database wiring, and
// the two discovery routes (`/api/openapi.json`, `/llms.txt`) the org's agent
// reads to learn this API, so nothing here documents it twice.

import { createApp, orgId, widgets } from "@clawnify/app";
import { query } from "./db.js";
import type { Env } from "./env.js";
import { registerPlaybook } from "./routes/playbook.js";
import { counts, registerPosts } from "./routes/posts.js";
import { registerSearches } from "./routes/searches.js";
import { scheduleRoutes } from "./routes/schedule.js";
import { registerVoices } from "./routes/voices.js";

const app = createApp<Env>({
  title: "OpenPostRadar",
  version: "1.0.0",
  description:
    "Social posts worth answering, found by an agent and queued for a person: each with why it matters, a drafted comment, and who should post it. Nothing is ever posted automatically.",
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || String(err) }, 500);
});

registerPosts(app);
registerSearches(app);
registerVoices(app);
registerPlaybook(app);
app.route("/", scheduleRoutes);

widgets(app, async (c) => {
  const org = orgId(c);
  if (!org) return [];
  const n = await counts(org);
  const top = await query<{ author_name: string; relevance: number }>(
    `SELECT author_name, relevance FROM posts WHERE org_id = ? AND status = 'new' ORDER BY relevance DESC, found_at DESC LIMIT 5`,
    [org],
  );
  return [
    { key: "waiting", kind: "metric", title: "Posts waiting for you", value: n.waiting, at: "/", icon: "inbox", color: "blue" },
    { key: "commented-7d", kind: "metric", title: "Commented in the last 7 days", value: n.commented_7d, at: "/history", icon: "history", color: "green" },
    {
      key: "best-waiting",
      kind: "list",
      title: "Best posts to answer",
      at: "/",
      icon: "inbox",
      color: "blue",
      items: top.map((p) => ({ label: p.author_name || "Unknown author", meta: `${p.relevance}% match`, at: "/" })),
    },
  ];
});

export default app;
