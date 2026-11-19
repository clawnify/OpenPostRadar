// The playbook card on the Searches page: what runs have learned about finding
// posts, written by the agent after each run. A person reads it here and can
// correct it; the next run starts from whatever is saved.

import { useEffect, useState } from "react";
import { ago, api, type Playbook as Saved } from "./api";
import { Card, inputClass, primaryClass } from "./ui";

export function Playbook({ onError }: { onError: (message: string) => void }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .playbook()
      .then((p) => {
        setSaved(p);
        setText(p.body);
      })
      .catch((e: Error) => onError(e.message));
  }, []);

  async function save() {
    setBusy(true);
    try {
      const p = await api.savePlaybook(text);
      setSaved(p);
      setText(p.body);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!saved) return null;
  const changed = text !== saved.body;
  return (
    <Card
      title="Playbook"
      hint="What your agent has learned about finding posts: wordings that found real questions, and ones that only found noise. It rewrites this after each run and reads it before the next. Edit it to steer the next run."
    >
      <textarea
        className={`${inputClass} min-h-40 font-mono`}
        value={text}
        placeholder="Empty until the first run writes it."
        onChange={(e) => setText(e.target.value)}
        maxLength={6000}
      />
      <div className="mt-3 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-faint">
          {saved.updated_at ? `Updated ${ago(saved.updated_at)} by ${saved.updated_by ?? "unknown"}` : "Not written yet"}
        </p>
        <button type="button" className={primaryClass} disabled={!changed || busy} onClick={() => void save()}>
          Save
        </button>
      </div>
    </Card>
  );
}
