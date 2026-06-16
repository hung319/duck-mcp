import { describe, it, expect, beforeEach, vi } from "vitest";
import { getVqdToken, resetVqdCache } from "./vqd.js";

const TEST_TOKEN = "4-1234567890abcdef";

function mockFetchResponse(
  overrides: Partial<Response> = {}
): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "x-vqd-4": TEST_TOKEN, ...Object.fromEntries(overrides.headers?.entries() ?? []) }),
    ...overrides,
  } as Response;
}

describe("getVqdToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetVqdCache();
  });

  describe("cache behavior", () => {
    it("returns cached token on second call without fetching", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse()
      );

      const first = await getVqdToken("hello");
      expect(first).toBe(TEST_TOKEN);

      // Reset call count — second call should not call fetch
      fetchMock.mockClear();

      const second = await getVqdToken("hello");
      expect(second).toBe(TEST_TOKEN);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("uses different cache keys for different queries", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse()
      );

      await getVqdToken("query1");
      await getVqdToken("query2");

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("uses different cache keys for different regions", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse()
      );

      await getVqdToken("test", { region: "us-en" });
      await getVqdToken("test", { region: "de-de" });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("defaults region to wt-wt when not provided", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse()
      );

      await getVqdToken("test");
      await getVqdToken("test", { region: "wt-wt" });

      // Both should hit same cache key
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("VQD acquisition", () => {
    it("sends POST request to duckduckgo.com with encoded query", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse()
      );

      await getVqdToken("hello world");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://duckduckgo.com/",
        expect.objectContaining({
          method: "POST",
          body: "q=hello%20world",
        })
      );
    });

    it("sends browser-like headers", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse()
      );

      await getVqdToken("test");

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;

      expect(headers["User-Agent"]).toContain("Mozilla/5.0");
      expect(headers["Accept"]).toBe("*/*");
      expect(headers["Accept-Language"]).toBe("en-US,en;q=0.9");
      expect(headers["Origin"]).toBe("https://duckduckgo.com");
      expect(headers["Referer"]).toBe("https://duckduckgo.com/");
      expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });

    it("extracts x-vqd-4 from response headers", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse()
      );

      const token = await getVqdToken("test");
      expect(token).toBe(TEST_TOKEN);
    });

    it("throws when x-vqd-4 header is missing", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({
          headers: new Headers(),
        })
      );

      await expect(getVqdToken("test")).rejects.toThrow(
        "Failed to acquire VQD token"
      );
    });
  });

  describe("error handling", () => {
    it("retries on network error with exponential backoff", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("Network failure"))
        .mockRejectedValueOnce(new Error("Network failure"))
        .mockResolvedValue(mockFetchResponse());

      const token = await getVqdToken("test");
      expect(token).toBe(TEST_TOKEN);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("throws on 403 without retry", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({
          ok: false,
          status: 403,
        })
      );

      await expect(getVqdToken("test")).rejects.toThrow(
        "Failed to acquire VQD token"
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws on 429 without retry", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({
          ok: false,
          status: 429,
        })
      );

      await expect(getVqdToken("test")).rejects.toThrow(
        "Failed to acquire VQD token"
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
