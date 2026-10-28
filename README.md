# Nobullshit YT Transcript Downloader (fixed)

Paste a YouTube URL or 11-character video ID, then download available transcript text as a `.txt` file named after the video.

## What was fixed

- Removed the unreliable browser requests to public CORS proxies.
- The browser now calls the first-party Netlify endpoint `/.netlify/functions/transcript`.
- Updated `youtube-transcript` from `^1.2.1` to `^1.3.1`.
- Separated the public website from Netlify function source.
- Added explicit errors for unavailable functions, unavailable captions, and upstream blocking.
- Supports watch, Shorts, live, embed and short YouTube links.

## Deploy on Netlify

**Use a Git-backed deployment.** A static-only drag-and-drop of `public/` will not install or deploy the serverless function.

1. Upload this project's **contents** (including `public/`, `netlify/`, `package.json`, and `netlify.toml`) to a GitHub repository.
2. Netlify: **Add new project > Import an existing project** and select the repository.
3. Use the build configuration already included in `netlify.toml`:
   - Build command: `npm install`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Deploy, then verify that a function called `transcript` appears in Netlify's Functions tab.
5. Test your endpoint with: `https://YOUR-SITE.netlify.app/.netlify/functions/transcript?url=INVALID`. It should return JSON with HTTP 400, not an HTML page or 404.
6. Open your site and try a public video that has captions.

## Local development

Requires Node.js 20 or newer and Netlify CLI.

```sh
npm install
npx netlify dev
```

Use the local URL printed by Netlify CLI (normally http://localhost:8888). Opening `public/index.html` directly or serving `public/` as static HTML will not provide the backend.

## Known limitation

`youtube-transcript` is an unofficial library. YouTube can restrict access from cloud-hosted IP addresses, including Netlify, even for videos with captions. In that case the function returns a clear upstream-blocking error. No free CORS proxy or static-only rewrite can guarantee access in that situation. A different permitted transcript data provider or hosting setup may be required if this occurs persistently.
