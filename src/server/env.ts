// The shared vocabulary every route module imports: the bindings, the app type,
// and the few helpers that would otherwise be rewritten per file.

import { OpenAPIHono, z } from "@clawnify/app";

export interface Env {
  Bindings: {
    DB: D1Database;
    /** Minted per org by the platform. Present in production, absent locally. */
    CLAWNIFY_TOKEN?: string;
  };
}

export type App = OpenAPIHono<Env>;

export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export const ErrorSchema = z.object({ error: z.string() }).openapi("Error");
export const OkSchema = z.object({ ok: z.boolean() }).openapi("Ok");

export function ok<T extends z.ZodTypeAny>(description: string, schema: T) {
  return { description, content: { "application/json": { schema } } };
}

export function fail(description: string) {
  return { description, content: { "application/json": { schema: ErrorSchema } } };
}

export const NO_ORG = { error: "No organisation on this request" } as const;
