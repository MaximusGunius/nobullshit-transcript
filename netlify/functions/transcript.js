"use strict";

const { fetchTranscript } = require("youtube-transcript");

function extractVideoId(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;

  try {
    const url = new URL(text);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = url.pathname.split("/")[1];
      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
    }

    const allowed = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"];
    if (!allowed.includes(host)) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[0] === "watch"
      ? url.searchParams.get("v")
      : ["shorts", "embed", "live", "v"].includes(parts[0]) ? parts[1] : null;
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}

function sanitizeFilename(title) {
  return (String(title || "transcript")
    .replace(/[\\/*?:"<>|]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150) || "transcript") + ".txt";
}

function result(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(data),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return result(405, { error: "Method not allowed. Use GET." });
  }

  const rawUrl = event.queryStringParameters?.url;
  if (!rawUrl) return result(400, { error: "Enter a YouTube URL or video ID." });

  const videoId = extractVideoId(rawUrl);
  if (!videoId) return result(400, { error: "Invalid YouTube URL or video ID." });

  let items;
  try {
    items = await fetchTranscript(videoId);
  } catch (error) {
    const message = String(error?.message || error).toLowerCase();
    console.error("Transcript fetch failed:", error);
    if (/captcha|too many requests|requestblocked|ipblocked|blocked|429|403|fetch failed|failed to fetch|network|timeout/.test(message)) {
      return result(503, { error: "YouTube is temporarily refusing transcript requests from this server. Try again later; cloud-hosted requests may be restricted." });
    }
    if (/disabled/.test(message)) {
      return result(404, { error: "Transcripts are disabled for this video." });
    }
    if (/no transcript|not available|unavailable|no longer available/.test(message)) {
      return result(404, { error: "No accessible transcript is available for this video." });
    }
    return result(502, { error: "YouTube transcript retrieval failed. Try again later or use another video." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return result(404, { error: "No transcript text was returned for this video." });
  }

  const transcript = items.map((item) => String(item?.text || "").trim()).filter(Boolean).join("\n");
  if (!transcript.trim()) return result(404, { error: "Transcript is empty for this video." });

  let title = videoId;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const info = await response.json();
      if (typeof info.title === "string" && info.title.trim()) title = info.title;
    }
  } catch (error) {
    console.warn("Title lookup failed; using video ID:", error?.message);
  }

  return result(200, { videoId, title, filename: sanitizeFilename(title), transcript });
};
