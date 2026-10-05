// The queue. The agent adds posts it found; a person decides what happens to
// each one. The agent never comments anywhere itself, so this table is the
// whole hand-off: a suggestion goes in, and a decision (with the words that
// were actually posted, or the reason it was not) comes back out.

import { createRoute, orgId, PageQuery, pagedResponse, pageParams, user, caller, z } from "@clawnify/app";
import { get, query, run } from "../db.js";
import { fail, NO_ORG, now, ok, uid, type App } from "../env.js";
import { normalizeUrl } from "../url.js";

const STATUS = ["new", "approved", "commented", "dismissed"] as const;

const PostSchema = z
  .object({
    id: z.string(),
    platform: z.string(),
    url: z.string(),
    author_name: z.string(),
    author_headline: z.string(),
    author_url: z.string().nullable(),
    text: z.string(),
    posted_at: z.string().nullable(),
    found_at: z.string(),
    search_id: z.string().nullable(),
    search_query: z.string().nullable(),
    language: z.string().nullable(),
    relevance: z.number(),
    reason: z.string(),
    suggested_comment: z.string(),
    voice_id: z.string().nullable(),
    voice_name: z.string().nullable(),
    status: z.enum(STATUS),
    dismiss_reason: z.string().nullable(),
    final_comment: z.string().nullable(),
    decided_by: z.string().nullable(),
    decided_at: z.string().nullable(),
  })
  .openapi("Post");

const SELECT = `SELECT p.id, p.platform, p.url, p.author_name, p.author_headline, p.author_url, p.text,
       p.posted_at, p.found_at, p.search_id, s.query AS search_query, p.language, p.relevance, p.reason,
       p.suggested_comment, p.voice_id, v.name AS voice_name, p.status, p.dismiss_reason,
       p.final_comment, p.decided_by, p.decided_at
  FROM posts p
  LEFT JOIN searches s ON s.id = p.search_id
  LEFT JOIN voices v ON v.id = p.voice_id`;

const NewPost = z.object({
  // Loose on purpose: a malformed link is reported per post as invalid_url
  // rather than failing validation for the whole batch around it.
  url: z.string().min(1).max(2000).openapi({ description: "The post's own link, as opened. Its identity: a URL already in the queue is skipped." }),
  platform: z.string().max(40).optional().openapi({ description: "Default linkedin" }),
  author_name: z.string().max(200),
  author_headline: z.string().max(400).optional(),
  author_url: z.string().max(2000).optional(),
  text: z.string().max(6000).openapi({ description: "The post's text as written. Trim, do not summarise." }),
  posted_at: z.string().max(40).optional().openapi({ description: "ISO time it was posted, when the platform says it precisely enough" }),
  search_id: z.string().optional().openapi({ description: "The search that found it" }),
  language: z.string().max(10).optional().openapi({ description: "ISO code of the post's language, e.g. nl" }),
  relevance: z.number().int().min(0).max(100),
  reason: z.string().max(400).openapi({ description: "One line a person reads to decide whether to trust the score" }),
  suggested_comment: z.string().max(3000),
  voice_id: z.string().optional().openapi({ description: "Who should post it. From GET /api/voices." }),
});

const Patch = z.object({
  status: z.enum(STATUS).optional(),
  suggested_comment: z.string().max(3000).optional(),
  voice_id: z.string().nullable().optional(),
  final_comment: z.string().max(3000).nullable().optional(),
  dismiss_reason: z.string().max(200).nullable().optional(),
});

function who(c: Parameters<typeof user>[0]): string {
  const u = user(c);
  return u?.name ?? u?.email ?? caller(c) ?? "unknown";
}

export function registerPosts(app: App) {
  const list = createRoute({
    method: "get",
    path: "/api/posts",
    tags: ["Posts"],
    summary: "The queue, or the history",
    description:
      "status=new is the queue, best first. status=commented and status=dismissed are the history, newest decision first: read the last 20 of each before a run, because the edits and the dismiss reasons are how this org wants it done.",
    request: {
      query: PageQuery.extend({
        status: z.enum(STATUS).optional().openapi({ description: "Default new" }),
        search_id: z.string().optional(),
        voice_id: z.string().optional(),
      }),
    },
    responses: { 200: pagedResponse("posts", PostSchema), 403: fail("No organisation") },
  });

  app.openapi(list, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const q = c.req.valid("query");
    const { page, limit, offset, search } = pageParams(q);
    const status = q.status ?? "new";

    const where = ["p.org_id = ?", "p.status = ?"];
    const args: unknown[] = [org, status];
    if (q.search_id) {
      where.push("p.search_id = ?");
      args.push(q.search_id);
    }
    if (q.voice_id) {
      where.push("p.voice_id = ?");
      args.push(q.voice_id);
    }
    if (search) {
      where.push("(p.text LIKE ? OR p.author_name LIKE ? OR p.suggested_comment LIKE ?)");
      const like = `%${search}%`;
      args.push(like, like, like);
    }
    const clause = where.join(" AND ");
    const order = status === "new" ? "p.relevance DESC, p.found_at DESC" : "p.decided_at DESC";
    const posts = await query(`${SELECT} WHERE ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, limit, offset]);
    const total = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM posts p WHERE ${clause}`, args);
    return c.json({ posts, total: Number(total?.n ?? 0), page, limit } as never, 200);
  });

  const one = createRoute({
    method: "get",
    path: "/api/posts/{id}",
    tags: ["Posts"],
    summary: "One post",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: ok("The post", PostSchema), 403: fail("No organisation"), 404: fail("Not found") },
  });

  app.openapi(one, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const post = await get(`${SELECT} WHERE p.id = ? AND p.org_id = ?`, [c.req.valid("param").id, org]);
    if (!post) return c.json({ error: "No such post" }, 404);
    return c.json(post as never, 200);
  });

  const check = createRoute({
    method: "post",
    path: "/api/posts/check",
    tags: ["Posts"],
    summary: "Which of these links are already known",
    description:
      "Call it with the links from a search page BEFORE reading or drafting anything. A known link (in the queue, commented or dismissed) needs no work.",
    request: {
      body: { content: { "application/json": { schema: z.object({ urls: z.array(z.string().max(2000)).min(1).max(50) }) } } },
    },
    responses: {
      200: ok(
        "The known ones",
        z.object({ known: z.array(z.object({ url: z.string(), status: z.enum(STATUS) })), unknown: z.array(z.string()) }),
      ),
      403: fail("No organisation"),
    },
  });

  app.openapi(check, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const asked = c.req.valid("json").urls;
    const pairs = asked.map((raw) => ({ raw, url: normalizeUrl(raw) }));
    const urls = [...new Set(pairs.map((p) => p.url).filter((u): u is string => !!u))];
    const rows = urls.length
      ? await query<{ url: string; status: (typeof STATUS)[number] }>(
          `SELECT url, status FROM posts WHERE org_id = ? AND url IN (${urls.map(() => "?").join(",")})`,
          [org, ...urls],
        )
      : [];
    const byUrl = new Map(rows.map((r) => [r.url, r.status]));
    const known = pairs.filter((p) => p.url && byUrl.has(p.url)).map((p) => ({ url: p.raw, status: byUrl.get(p.url!)! }));
    const unknown = pairs.filter((p) => p.url && !byUrl.has(p.url)).map((p) => p.raw);
    return c.json({ known, unknown } as never, 200);
  });

  const add = createRoute({
    method: "post",
    path: "/api/posts",
    tags: ["Posts"],
    summary: "Add what a run found",
    description:
      "Up to 25 posts per call. A link already known is skipped, never updated: a post somebody dismissed stays dismissed, and one in the queue keeps the edits a person made.",
    request: {
      body: { content: { "application/json": { schema: z.object({ posts: z.array(NewPost).min(1).max(25) }) } } },
    },
    responses: {
      200: ok(
        "What happened to each",
        z.object({
          added: z.number(),
          results: z.array(
            z.object({ url: z.string(), result: z.enum(["added", "known", "invalid_url"]), id: z.string().nullable() }),
          ),
        }),
      ),
      403: fail("No organisation"),
    },
  });

  app.openapi(add, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const results: { url: string; result: "added" | "known" | "invalid_url"; id: string | null }[] = [];
    let added = 0;
    for (const p of c.req.valid("json").posts) {
      const url = normalizeUrl(p.url);
      if (!url) {
        results.push({ url: p.url, result: "invalid_url", id: null });
        continue;
      }
      const id = uid();
      const at = now();
      // INSERT OR IGNORE on the (org_id, url) unique index: the database, not a
      // prior SELECT, decides what is new, so two runs racing on one post
      // still produce one row.
      await run(
        `INSERT OR IGNORE INTO posts (id, org_id, platform, url, author_name, author_headline, author_url, text,
           posted_at, found_at, search_id, language, relevance, reason, suggested_comment, voice_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
        [
          id,
          org,
          (p.platform ?? "linkedin").toLowerCase(),
          url,
          p.author_name,
          p.author_headline ?? "",
          p.author_url ?? null,
          p.text,
          p.posted_at ?? null,
          at,
          p.search_id ?? null,
          p.language ?? null,
          p.relevance,
          p.reason,
          p.suggested_comment,
          p.voice_id ?? null,
          at,
        ],
      );
      // Whose row holds this URL now. Not every storage backend reports a
      // change count, so the id is the reliable answer to "was it mine".
      const row = await get<{ id: string }>(`SELECT id FROM posts WHERE org_id = ? AND url = ?`, [org, url]);
      const inserted = row?.id === id;
      if (inserted) added++;
      results.push({ url: p.url, result: inserted ? "added" : "known", id: inserted ? id : null });
    }
    return c.json({ added, results } as never, 200);
  });

  const patch = createRoute({
    method: "patch",
    path: "/api/posts/{id}",
    tags: ["Posts"],
    summary: "Decide, or edit the suggestion",
    description:
      "Changes only the fields sent. status=commented records final_comment (the suggestion, if none is sent). status=dismissed takes a dismiss_reason. status=new reopens it.",
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: Patch } } },
    },
    responses: { 200: ok("The post as saved", PostSchema), 403: fail("No organisation"), 404: fail("Not found") },
  });

  app.openapi(patch, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const id = c.req.valid("param").id;
    const body = c.req.valid("json");
    const existing = await get<{ suggested_comment: string; final_comment: string | null }>(
      `SELECT suggested_comment, final_comment FROM posts WHERE id = ? AND org_id = ?`,
      [id, org],
    );
    if (!existing) return c.json({ error: "No such post" }, 404);

    const sets: string[] = [];
    const args: unknown[] = [];
    const set = (col: string, val: unknown) => {
      sets.push(`${col} = ?`);
      args.push(val);
    };
    if (body.suggested_comment !== undefined) set("suggested_comment", body.suggested_comment);
    if (body.voice_id !== undefined) set("voice_id", body.voice_id);
    if (body.final_comment !== undefined) set("final_comment", body.final_comment);
    if (body.dismiss_reason !== undefined) set("dismiss_reason", body.dismiss_reason);
    if (body.status !== undefined) {
      set("status", body.status);
      if (body.status === "new") {
        set("decided_by", null);
        set("decided_at", null);
      } else {
        set("decided_by", who(c));
        set("decided_at", now());
      }
      if (body.status === "commented" && body.final_comment === undefined && existing.final_comment === null) {
        set("final_comment", body.suggested_comment ?? existing.suggested_comment);
      }
    }
    if (sets.length) await run(`UPDATE posts SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`, [...args, id, org]);
    return c.json((await get(`${SELECT} WHERE p.id = ? AND p.org_id = ?`, [id, org])) as never, 200);
  });

  const overview = createRoute({
    method: "get",
    path: "/api/overview",
    tags: ["Posts"],
    summary: "The radar at a glance",
    description: "Counts for the header and for a quick status check. A handful of indexed counts.",
    responses: {
      200: ok(
        "Counts",
        z.object({
          waiting: z.number(),
          commented_7d: z.number(),
          dismissed_7d: z.number(),
          active_searches: z.number(),
          last_run_at: z.string().nullable(),
        }),
      ),
      403: fail("No organisation"),
    },
  });

  app.openapi(overview, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    return c.json((await counts(org)) as never, 200);
  });
}

export async function counts(org: string) {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const n = async (sql: string, args: unknown[]) => Number((await get<{ n: number }>(sql, args))?.n ?? 0);
  const last = await get<{ at: string | null }>(`SELECT MAX(last_run_at) AS at FROM searches WHERE org_id = ?`, [org]);
  return {
    waiting: await n(`SELECT COUNT(*) AS n FROM posts WHERE org_id = ? AND status = 'new'`, [org]),
    commented_7d: await n(`SELECT COUNT(*) AS n FROM posts WHERE org_id = ? AND status = 'commented' AND decided_at >= ?`, [org, since]),
    dismissed_7d: await n(`SELECT COUNT(*) AS n FROM posts WHERE org_id = ? AND status = 'dismissed' AND decided_at >= ?`, [org, since]),
    active_searches: await n(`SELECT COUNT(*) AS n FROM searches WHERE org_id = ? AND active = 1`, [org]),
    last_run_at: last?.at ?? null,
  };
}
