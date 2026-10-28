"use strict";

const input = document.getElementById("url");
const button = document.getElementById("download");
const status = document.getElementById("status");
const FUNCTION_URL = "/.netlify/functions/transcript";

function setStatus(message, type = "") {
  status.textContent = message;
  status.className = type;
}

function validVideoInput(value) {
  const text = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return true;

  try {
    const url = new URL(text);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    const youtubeHost = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host);
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      return /^[A-Za-z0-9_-]{11}$/.test(url.pathname.split('/')[1] || '');
    }
    if (!youtubeHost) return false;
    const path = url.pathname.split('/').filter(Boolean);
    const videoId = path[0] === 'watch' ? url.searchParams.get('v') :
      ['shorts', 'embed', 'live', 'v'].includes(path[0]) ? path[1] : null;
    return /^[A-Za-z0-9_-]{11}$/.test(videoId || '');
  } catch {
    return false;
  }
}

async function fetchTranscript(inputUrl) {
  let response;
  try {
    response = await fetch(`${FUNCTION_URL}?url=${encodeURIComponent(inputUrl)}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("Cannot reach the transcript service. Check your connection and Netlify deployment.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Transcript service not found. Deploy this project through Netlify with Functions enabled (not a static-only upload).");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The transcript service returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.error || `Transcript service returned HTTP ${response.status}.`);
  }
  if (!data || typeof data.transcript !== "string" || !data.transcript.trim()) {
    throw new Error("The transcript service returned no transcript text.");
  }
  return data;
}

function downloadText(transcript, filename) {
  const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename || "transcript.txt";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

input.addEventListener("input", () => {
  button.disabled = !input.value.trim();
  if (!status.classList.contains("success")) setStatus("");
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !button.disabled) button.click();
});

button.addEventListener("click", async () => {
  const userInput = input.value.trim();
  if (!userInput) return;
  if (!validVideoInput(userInput)) {
    setStatus("Enter a valid YouTube URL or 11-character video ID.", "error");
    return;
  }

  button.disabled = true;
  setStatus("Fetching transcript...");

  try {
    const data = await fetchTranscript(userInput);
    downloadText(data.transcript, data.filename);
    setStatus(`Downloaded: ${data.filename || "transcript.txt"}`, "success");
  } catch (error) {
    setStatus(error.message || "Transcript download failed.", "error");
  } finally {
    button.disabled = !input.value.trim();
  }
});
