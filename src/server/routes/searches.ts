// What the radar looks for. A person owns this list; the agent runs it and
// reports each run, so a search nobody ran for days is visible as such.

import { createRoute, orgId, PageQuery, pagedResponse, pageParams, z } from "@clawnify/app";
import { get, query, run } from "../db.js";
import { fail, NO_ORG, now, ok, OkSchema, uid, type App } from "../env.js";

const SearchSchema = z
  .object({
    id: z.string(),
    query: z.string(),
    platform: z.string(),
    intent: z.string(),
    active: z.boolean(),
    last_run_at: z.string().nullable(),
    last_found: z.number(),
    // What people did with this search's finds: its signal-to-noise. A search
    // whose finds are mostly skipped is costing a person time, not saving it.
    commented: z.number(),
    skipped: z.number(),
    created_at: z.string(),
  })
  .openapi("Search");

const Write = z.object({
  query: z.string().min(1).max(200).openapi({ description: "Exactly what is typed into the platform's search box" }),
  platform: z.string().max(40).optional().openapi({ description: "Default linkedin" }),
  intent: z.string().max(400).optional().openapi({ description: "Why this search exists, in one sentence" }),
  active: z.boolean().optional(),
});

type Row = Omit<z.infer<typeof SearchSchema>, "active"> & { active: number };
const shape = (r: Row) => ({ ...r, active: !!r.active });
const COLS = `id, query, platform, intent, active, last_run_at, last_found, created_at,
  (SELECT COUNT(*) FROM posts p WHERE p.search_id = searches.id AND p.status = 'commented') AS commented,
  (SELECT COUNT(*) FROM posts p WHERE p.search_id = searches.id AND p.status = 'dismissed') AS skipped`;

export function registerSearches(app: App) {
  const list = createRoute({
    method: "get",
    path: "/api/searches",
    tags: ["Searches"],
    summary: "The searches",
    description: "active=true for the ones to run. Oldest first, which is the order to run them in. commented and skipped count what people did with each search's finds: propose pausing or rewording one that is mostly skipped.",
    request: { query: PageQuery.extend({ active: z.enum(["true", "false"]).optional() }) },
    responses: { 200: pagedResponse("searches", SearchSchema), 403: fail("No organisation") },
  });

  app.openapi(list, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const q = c.req.valid("query");
    const { page, limit, offset, search } = pageParams(q);
    const where = ["org_id = ?"];
    const args: unknown[] = [org];
    if (q.active) {
      where.push("active = ?");
      args.push(q.active === "true" ? 1 : 0);
    }
    if (search) {
      where.push("(query LIKE ? OR intent LIKE ?)");
      args.push(`%${search}%`, `%${search}%`);
    }
    const clause = where.join(" AND ");
    const rows = await query<Row>(`SELECT ${COLS} FROM searches WHERE ${clause} ORDER BY created_at ASC LIMIT ? OFFSET ?`, [
      ...args,
      limit,
      offset,
    ]);
    const total = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM searches WHERE ${clause}`, args);
    return c.json({ searches: rows.map(shape), total: Number(total?.n ?? 0), page, limit } as never, 200);
  });

  const create = createRoute({
    method: "post",
    path: "/api/searches",
    tags: ["Searches"],
    summary: "Add a search",
    request: { body: { content: { "application/json": { schema: Write } } } },
    responses: { 200: ok("The search", SearchSchema), 403: fail("No organisation") },
  });

  app.openapi(create, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const b = c.req.valid("json");
    const id = uid();
    await run(
      `INSERT INTO searches (id, org_id, query, platform, intent, active, last_found, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, org, b.query.trim(), (b.platform ?? "linkedin").toLowerCase(), b.intent ?? "", b.active === false ? 0 : 1, now()],
    );
    return c.json(shape((await get<Row>(`SELECT ${COLS} FROM searches WHERE id = ?`, [id]))!) as never, 200);
  });

  const update = createRoute({
    method: "patch",
    path: "/api/searches/{id}",
    tags: ["Searches"],
    summary: "Change a search, or pause it",
    description: "Changes only the fields sent.",
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: Write.partial() } } },
    },
    responses: { 200: ok("The search", SearchSchema), 403: fail("No organisation"), 404: fail("Not found") },
  });

  app.openapi(update, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const id = c.req.valid("param").id;
    const b = c.req.valid("json");
    const sets: string[] = [];
    const args: unknown[] = [];
    if (b.query !== undefined) sets.push("query = ?"), args.push(b.query.trim());
    if (b.platform !== undefined) sets.push("platform = ?"), args.push(b.platform.toLowerCase());
    if (b.intent !== undefined) sets.push("intent = ?"), args.push(b.intent);
    if (b.active !== undefined) sets.push("active = ?"), args.push(b.active ? 1 : 0);
    if (sets.length) await run(`UPDATE searches SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`, [...args, id, org]);
    const row = await get<Row>(`SELECT ${COLS} FROM searches WHERE id = ? AND org_id = ?`, [id, org]);
    if (!row) return c.json({ error: "No such search" }, 404);
    return c.json(shape(row) as never, 200);
  });

  const ran = createRoute({
    method: "post",
    path: "/api/searches/{id}/ran",
    tags: ["Searches"],
    summary: "Report a run",
    description: "Call it after every run of this search, also when nothing new turned up (found: 0).",
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: z.object({ found: z.number().int().min(0) }) } } },
    },
    responses: { 200: ok("Saved", OkSchema), 403: fail("No organisation") },
  });

  app.openapi(ran, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    await run(`UPDATE searches SET last_run_at = ?, last_found = ? WHERE id = ? AND org_id = ?`, [
      now(),
      c.req.valid("json").found,
      c.req.valid("param").id,
      org,
    ]);
    return c.json({ ok: true } as never, 200);
  });

  const remove = createRoute({
    method: "delete",
    path: "/api/searches/{id}",
    tags: ["Searches"],
    summary: "Delete a search",
    description: "Posts it found stay; they just stop naming it.",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: ok("Deleted", OkSchema), 403: fail("No organisation") },
  });

  app.openapi(remove, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const id = c.req.valid("param").id;
    await run(`UPDATE posts SET search_id = NULL WHERE search_id = ? AND org_id = ?`, [id, org]);
    await run(`DELETE FROM searches WHERE id = ? AND org_id = ?`, [id, org]);
    return c.json({ ok: true } as never, 200);
  });
}
