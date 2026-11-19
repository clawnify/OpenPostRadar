import { describe, expect, it } from "vitest";
import { normalizeUrl, platformOf } from "./url";

describe("platformOf", () => {
  it("reads the platform from the link's host", () => {
    expect(platformOf("https://www.linkedin.com/posts/jan-123")).toBe("linkedin");
    expect(platformOf("https://old.reddit.com/r/AmazonFBA/comments/abc")).toBe("reddit");
    expect(platformOf("https://www.reddit.com/r/AmazonSeller/comments/abc")).toBe("reddit");
  });

  it("knows no other site, and no look-alike host", () => {
    expect(platformOf("https://example.com/post/1")).toBeNull();
    expect(platformOf("https://notreddit.com/r/x")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("drops tracking, fragments and the trailing slash", () => {
    expect(normalizeUrl("https://www.linkedin.com/posts/jan-123?utm_source=share&rcm=x#comments")).toBe(
      "https://www.linkedin.com/posts/jan-123",
    );
    expect(normalizeUrl("https://www.linkedin.com/posts/jan-123/")).toBe("https://www.linkedin.com/posts/jan-123");
  });

  it("folds LinkedIn's country and mobile hosts into one", () => {
    expect(normalizeUrl("https://nl.linkedin.com/posts/jan-123")).toBe("https://www.linkedin.com/posts/jan-123");
    expect(normalizeUrl("http://m.linkedin.com/feed/update/urn:li:activity:7/")).toBe(
      "https://www.linkedin.com/feed/update/urn:li:activity:7",
    );
  });

  it("keeps other sites' paths intact", () => {
    expect(normalizeUrl("https://www.reddit.com/r/FulfillmentByAmazon/comments/abc/title/")).toBe(
      "https://www.reddit.com/r/FulfillmentByAmazon/comments/abc/title",
    );
  });

  it("rejects what is not a web link", () => {
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
});
