export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? id : null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      const idParam = parsed.searchParams.get("v");
      if (idParam) return idParam;
      const match = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (match) return match[1] ?? null;
    }
  } catch {}
  const fallback = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return fallback ? (fallback[1] as string) : null;
}
