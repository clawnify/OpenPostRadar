// Who may comment: the company page and the people who speak for it. The agent
// picks one per suggestion; a person can switch it before posting.

import { createRoute, orgId, PageQuery, pagedResponse, pageParams, z } from "@clawnify/app";
import { get, query, run } from "../db.js";
import { fail, NO_ORG, now, ok, OkSchema, uid, type App } from "../env.js";

const KIND = ["company", "person"] as const;

const VoiceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(KIND),
    profile_url: z.string().nullable(),
    notes: z.string(),
    created_at: z.string(),
  })
  .openapi("Voice");

const Write = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(KIND).optional().openapi({ description: "company = a company page, person = someone's own profile. Default person." }),
  profile_url: z.string().max(2000).nullable().optional(),
  notes: z.string().max(1000).optional().openapi({ description: "How this voice talks and when to use it" }),
});

const COLS = "id, name, kind, profile_url, notes, created_at";

export function registerVoices(app: App) {
  const list = createRoute({
    method: "get",
    path: "/api/voices",
    tags: ["Voices"],
    summary: "Who can comment",
    request: { query: PageQuery },
    responses: { 200: pagedResponse("voices", VoiceSchema), 403: fail("No organisation") },
  });

  app.openapi(list, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const { page, limit, offset, search } = pageParams(c.req.valid("query"));
    const where = search ? "org_id = ? AND name LIKE ?" : "org_id = ?";
    const args: unknown[] = search ? [org, `%${search}%`] : [org];
    const voices = await query(`SELECT ${COLS} FROM voices WHERE ${where} ORDER BY created_at ASC LIMIT ? OFFSET ?`, [
      ...args,
      limit,
      offset,
    ]);
    const total = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM voices WHERE ${where}`, args);
    return c.json({ voices, total: Number(total?.n ?? 0), page, limit } as never, 200);
  });

  const create = createRoute({
    method: "post",
    path: "/api/voices",
    tags: ["Voices"],
    summary: "Add a voice",
    request: { body: { content: { "application/json": { schema: Write } } } },
    responses: { 200: ok("The voice", VoiceSchema), 403: fail("No organisation") },
  });

  app.openapi(create, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const b = c.req.valid("json");
    const id = uid();
    await run(`INSERT INTO voices (id, org_id, name, kind, profile_url, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      id,
      org,
      b.name.trim(),
      b.kind ?? "person",
      b.profile_url ?? null,
      b.notes ?? "",
      now(),
    ]);
    return c.json((await get(`SELECT ${COLS} FROM voices WHERE id = ?`, [id])) as never, 200);
  });

  const update = createRoute({
    method: "patch",
    path: "/api/voices/{id}",
    tags: ["Voices"],
    summary: "Change a voice",
    description: "Changes only the fields sent.",
    request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: Write.partial() } } } },
    responses: { 200: ok("The voice", VoiceSchema), 403: fail("No organisation"), 404: fail("Not found") },
  });

  app.openapi(update, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const id = c.req.valid("param").id;
    const b = c.req.valid("json");
    const sets: string[] = [];
    const args: unknown[] = [];
    if (b.name !== undefined) sets.push("name = ?"), args.push(b.name.trim());
    if (b.kind !== undefined) sets.push("kind = ?"), args.push(b.kind);
    if (b.profile_url !== undefined) sets.push("profile_url = ?"), args.push(b.profile_url);
    if (b.notes !== undefined) sets.push("notes = ?"), args.push(b.notes);
    if (sets.length) await run(`UPDATE voices SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`, [...args, id, org]);
    const row = await get(`SELECT ${COLS} FROM voices WHERE id = ? AND org_id = ?`, [id, org]);
    if (!row) return c.json({ error: "No such voice" }, 404);
    return c.json(row as never, 200);
  });

  const remove = createRoute({
    method: "delete",
    path: "/api/voices/{id}",
    tags: ["Voices"],
    summary: "Remove a voice",
    description: "Suggestions that named it keep their text and lose the name.",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: ok("Deleted", OkSchema), 403: fail("No organisation") },
  });

  app.openapi(remove, async (c) => {
    const org = orgId(c);
    if (!org) return c.json(NO_ORG, 403);
    const id = c.req.valid("param").id;
    await run(`UPDATE posts SET voice_id = NULL WHERE voice_id = ? AND org_id = ?`, [id, org]);
    await run(`DELETE FROM voices WHERE id = ? AND org_id = ?`, [id, org]);
    return c.json({ ok: true } as never, 200);
  });
}
