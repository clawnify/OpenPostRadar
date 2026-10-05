// One post in the queue: what was said, why it matters, and the comment ready
// to paste. The person posts it themselves; this card only makes that a
// two-click job and records what happened, so the agent can learn from it.

import { useRef, useState } from "react";
import { ago, api, type Post, type Voice } from "./api";
import { inputClass, Pill, primaryClass, quietClass } from "./ui";

const DISMISS_REASONS = ["Not relevant", "A competitor", "Too old", "Already answered", "Not our audience"];

/**
 * Copy text from inside the dashboard iframe. The async clipboard API needs a
 * permission the host frame may not grant, so the fallback selects the textarea
 * and uses the legacy command, which works on a user click in any frame.
 */
async function copy(text: string, el: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!el) return false;
    el.focus();
    el.select();
    return document.execCommand("copy");
  }
}

export function PostCard({
  post,
  voices,
  onChange,
  onError,
}: {
  post: Post;
  voices: Voice[];
  onChange: (next: Post) => void;
  onError: (message: string) => void;
}) {
  const [comment, setComment] = useState(post.suggested_comment);
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [copied, setCopied] = useState<"yes" | "manual" | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  async function save(patch: Parameters<typeof api.updatePost>[1]) {
    try {
      onChange(await api.updatePost(post.id, patch));
    } catch (e) {
      onError((e as Error).message);
    }
  }

  async function copyAndOpen() {
    const done = await copy(comment, box.current);
    setCopied(done ? "yes" : "manual");
    // The link itself opens the post (an anchor, so no popup blocker objects);
    // this records that a person took it, with any edits they made.
    void save({ status: "approved", suggested_comment: comment });
  }

  const long = post.text.length > 420;
  const strong = post.relevance >= 75;

  return (
    <article className="card p-5">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {post.author_url ? (
              <a href={post.author_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {post.author_name || "Unknown author"}
              </a>
            ) : (
              post.author_name || "Unknown author"
            )}
          </p>
          {post.author_headline && <p className="truncate text-sm text-muted">{post.author_headline}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-faint">{ago(post.posted_at ?? post.found_at)}</span>
          <Pill tone={strong ? "success" : "muted"}>
            <span className="tnum">{post.relevance}% match</span>
          </Pill>
        </div>
      </header>

      <p className={`mt-3 text-sm whitespace-pre-line ${long && !expanded ? "line-clamp-6" : ""}`}>{post.text}</p>
      {long && (
        <button type="button" className="mt-1 text-sm font-medium text-muted hover:text-foreground" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show all"}
        </button>
      )}

      <p className="mt-3 text-sm text-muted">
        <span className="font-medium text-foreground">Why: </span>
        {post.reason || "No reason given."}
        {post.search_query && <span className="text-faint"> · found by “{post.search_query}”</span>}
      </p>

      <div className="mt-4 rounded-lg bg-sunken p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1 text-sm font-medium">Suggested comment</span>
          <label className="flex items-center gap-2 text-sm whitespace-nowrap text-muted">
            Post as
            <select
              className={`${inputClass} w-auto py-1.5`}
              value={post.voice_id ?? ""}
              onChange={(e) => void save({ voice_id: e.target.value || null })}
            >
              <option value="">Anyone</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          ref={box}
          className={`${inputClass} mt-2 min-h-28 resize-y`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => comment !== post.suggested_comment && void save({ suggested_comment: comment })}
          aria-label="Suggested comment"
        />
      </div>

      {post.status === "approved" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="flex-1 text-sm text-muted">
            {copied === "manual" ? "Copy the comment above, then paste it on the post." : "Comment copied."} Did you post it?
          </p>
          <a href={post.url} target="_blank" rel="noopener noreferrer" className={quietClass}>
            Open post again
          </a>
          <button type="button" className={quietClass} onClick={() => void save({ status: "new" })}>
            Not yet
          </button>
          <button type="button" className={primaryClass} onClick={() => void save({ status: "commented", final_comment: comment })}>
            Yes, posted
          </button>
        </div>
      ) : dismissing ? (
        <div className="mt-4">
          <p className="text-sm text-muted">Why skip it? Your agent reads this to find better posts next time.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DISMISS_REASONS.map((r) => (
              <button key={r} type="button" className={quietClass} onClick={() => void save({ status: "dismissed", dismiss_reason: r })}>
                {r}
              </button>
            ))}
            <button type="button" className="px-2 text-sm text-faint hover:text-foreground" onClick={() => setDismissing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={quietClass} onClick={() => setDismissing(true)}>
            Skip
          </button>
          <a href={post.url} target="_blank" rel="noopener noreferrer" className={primaryClass} onClick={() => void copyAndOpen()}>
            Copy comment and open post
          </a>
        </div>
      )}
    </article>
  );
}
