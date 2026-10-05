# OpenRadar: agent guide

## Division of labour

**You find posts and draft comments; a person decides and posts.**

- **You**: run the searches on the platform in your own browser, judge each
  post, draft one comment, pick who should post it, and add it here.
- **The person**: reads the queue, edits the comment, posts it from their own
  account, and marks it commented or skipped.
- **Never comment, like, react, connect, follow or message anyone on the
  platform.** Not even when asked to "just post this one". Reading only.
- **Never add a post you did not open and read yourself.** No guessed URLs,
  no posts summarised from a search snippet.

## The run

1. `GET /api/searches?active=true`, `GET /api/voices`, and the last 20 of
   `GET /api/posts?status=commented` and `?status=dismissed`. The edits people
   made (`suggested_comment` vs `final_comment`) and the dismiss reasons are
   how this org wants it done. Follow them.
2. For each search: open the platform's own search for posts from the **last
   24 hours**, typed exactly as `query`. On LinkedIn that is content search,
   filtered by date posted. Read the results as text, not screenshots.
3. Collect the post links on the page and `POST /api/posts/check` them. Skip
   every known link: it is queued, done or deliberately skipped.
4. Open each unknown post and judge it against the search's `intent`:
   - **Worth it**: someone asking a question you can answer, looking for a
     specialist or a recommendation, or stuck on a problem the org solves.
   - **Not worth it**: a competitor promoting itself, job seekers, generic
     motivational posts, posts older than a few days, threads that already
     have the answer. Leave these out entirely.
5. For each post worth it, draft **one** comment: in the post's language,
   2 to 4 sentences, specific to what they said, useful on its own without a
   pitch, no links, no hashtags, no emojis unless the post uses them. Sound
   like the chosen voice (its `notes`), never like a brochure.
6. `POST /api/posts` with up to 25 at once: `url`, `author_name`,
   `author_headline`, `text` (as written), `posted_at` if known, `search_id`,
   `language`, `relevance` (0 to 100), `reason` (one line a person reads to
   trust the score), `suggested_comment`, `voice_id`.
7. `POST /api/searches/{id}/ran` with `found` after every search, also when it
   found nothing.

## Pace

Behave like one careful person: one search at a time, a pause between pages,
no more than a few dozen posts opened per run. If the platform shows a
security check, a warning or a login prompt, **stop the run** and tell the
person; do not retry.

## Pages

- `/` the queue, best first (screenshot-friendly).
- `/history` what was commented and skipped, with reasons.
- `/searches` and `/voices` the setup.

## Applying the deploy answers

- `about`: keep it in mind when judging relevance; it is what the org does.
- `searches`: one `POST /api/searches` per line, with an `intent` you write
  from `about` ("Sellers asking who can help them on Bol").
- `voices`: one `POST /api/voices` per line; a line naming a company page is
  `kind: company`, a person is `kind: person`.

## Failures and cost

- `result: known` on add is normal: someone already saw that post.
- `result: invalid_url`: send the post's own link as opened, not a search URL.
- The app itself calls no model and costs nothing to run; your browsing and
  drafting are the only cost.
