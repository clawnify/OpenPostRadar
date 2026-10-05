# OpenRadar: agent guide

## Division of labour

**You find posts and draft comments; a person decides and posts.**

- **You**: run the searches on the platform in your own browser, judge each
  post, draft one comment, pick who should post it, and add it here.
- **The person**: reads the queue, edits the comment, posts it from their own
  account, and marks it commented or skipped.
- **Never comment, like, react, connect, follow or message anyone on the
  platform.** Not even when asked to "just post this one". Reading only.
- **Never add a post you have not read in full.** The results page is
  enough when it shows the whole post; when it cuts the text off, open it. No
  guessed URLs, no posts judged from a snippet.

## The run

1. `GET /api/searches?active=true`, `GET /api/voices`, and the last 20 of
   `GET /api/posts?status=commented` and `?status=dismissed`. What people
   changed in your drafts (`original_comment` vs `final_comment`) and why they
   skipped (`dismiss_reason`) is how this org wants it done. Follow it.
2. For each search: open the platform's own search for posts from the **past
   week**, newest first, typed exactly as `query`. On LinkedIn that is content
   search with the date-posted filter. Read the results page as text, not
   screenshots.
3. Collect the post links on the page and `POST /api/posts/check` them. Skip
   every known link: it is queued, done or deliberately skipped.
4. Judge each unknown post from the results page against the search's
   `intent`. Open a post on its own only when its text is cut off and it looks
   worth it.
   - **Worth it**: someone asking a question you can answer, looking for a
     specialist or a recommendation, or stuck on a problem the org solves.
   - **Not worth it**: a competitor promoting itself, job seekers, generic
     motivational posts, threads that already have the answer, posts older
     than 7 days. Leave these out entirely.
   - Someone asking for help stays worth answering for days; the card shows
     its age, so a person can tell a fresh question from an old one.
5. For each post worth it, draft **one** comment: in the post's language, at
   least 15 words and at most 4 sentences, built on one specific point about
   what they said or one real question back. No pitch, no "DM me", no links,
   no hashtags, no emojis unless the post uses them. Sound like the chosen
   voice (its `notes`), never like a brochure: readers spot generic AI text
   and hold it against the person posting it.
   - **Voice:** default to a person's own profile (usually the founder);
     comments from people reach far more than comments from a company page.
     Use the company page only for posts about the company itself.
6. `POST /api/posts` with up to 25 at once: `url`, `author_name`,
   `author_headline`, `text` (as written), `posted_at` if known, `search_id`,
   `language`, `relevance` (0 to 100), `reason` (one line a person reads to
   trust the score), `suggested_comment`, `voice_id`.
7. `POST /api/searches/{id}/ran` with `found` after every search, also when it
   found nothing.
8. Each search carries how many of its finds were `commented` and `skipped`.
   When one is mostly skipped, propose rewording or pausing it to the person;
   do not change it silently.

## Pace

Behave like one careful person: **one tab**, one search at a time, a pause
between pages, and only a handful of posts opened on their own per run. Add
at most 15 posts a day across all runs: a person cannot answer more than that
well, so the best 15 beat the next 30. If the platform shows a security
check, a warning or a login prompt, **stop the run** and tell the person; do
not retry.

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
