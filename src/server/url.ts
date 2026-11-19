// A post's identity is its URL, so two spellings of one URL must become one.
//
// The same LinkedIn post arrives as `.../posts/x-123?utm_source=share`, as
// `.../posts/x-123/` and as `.../feed/update/urn:li:activity:123/`. The first
// two differ only in noise and are folded here. The third is a different URL
// for the same post; the agent is told to send the one it opened, and the
// queue's job is to never show a URL twice, not to resolve every alias.

export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.protocol = "https:";
  u.hash = "";
  u.search = "";
  u.hostname = u.hostname.toLowerCase().replace(/^(www|m|nl|de|fr|be)\.linkedin\.com$/, "www.linkedin.com");
  const path = u.pathname.replace(/\/+$/, "");
  return `${u.protocol}//${u.hostname}${path}`;
}

// The link says where a post is, so it decides the platform. What a run sends
// is used only for a site not named here: the agent once left it out on Reddit
// posts, and the default filed them as LinkedIn.
const PLATFORMS: [string, string][] = [
  ["linkedin.com", "linkedin"],
  ["reddit.com", "reddit"],
];

export function platformOf(url: string): string | null {
  const host = new URL(url).hostname.toLowerCase();
  return PLATFORMS.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? null;
}
