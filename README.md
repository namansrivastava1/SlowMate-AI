# SlowMate 🦥
**Do less. Move forward.** SlowMate turns an overwhelming task dump into a small, kind, time-aware action plan using an open-weight model running locally through Ollama.

## Why this project fits “Slow and Steady”
SlowMate rewards low-effort progress: users paste a messy list, choose their energy level and available time, and receive a few concrete steps plus a tiny win. It is intentionally not a cloud AI wrapper.

## Stack
- HTML, CSS, JavaScript — responsive frontend, no frontend framework
- [Ollama](https://ollama.com/) — runs the model locally
- [Qwen2.5 3B](https://ollama.com/library/qwen2.5) — open-weight model (check the model card/license for terms)
- Browser `localStorage` — recent plans stay in this browser

## Run it locally
1. Install Ollama from https://ollama.com/.
2. Open a terminal and download the model:
   ```bash
   ollama pull qwen2.5:3b
   ```
3. Make sure Ollama is running. In another terminal, start the frontend from this folder:
   ```bash
   python -m http.server 8000
   ```
4. Open http://localhost:8000.

### Browser connection / CORS note
The frontend calls Ollama at `http://localhost:11434`. Some Ollama/browser setups block requests from the local web origin. If you see a connection error:
- Check `http://localhost:11434/api/tags` in your browser.
- Configure Ollama's `OLLAMA_ORIGINS` to allow the local origin `http://localhost:8000`, then restart Ollama. Use the narrowest origin setting supported by your installation; avoid `*` unless you understand the security trade-off.
- See the official Ollama documentation for platform-specific environment-variable steps: https://github.com/ollama/ollama/blob/main/docs/faq.md

If the browser continues to block the request, a tiny local backend proxy is the best next step; do not put a hosted AI API key into frontend JavaScript.

## Features
- Energy-aware and time-aware plans
- Checklist steps you can mark complete
- Copy plan to clipboard
- Recent brain dumps saved in local browser storage
- Responsive layout for desktop and mobile
- Local inference means task text does not need to be sent to a third-party AI service

## Honest limitations
- Output quality depends on the local model and prompt.
- The first model run can be slow, especially on lower-memory laptops.
- Local inference is not automatically “free” in every sense: it uses your device's compute and electricity.
- Browser history is stored locally and can be cleared by clearing this app's browser data.
- The project has not been tested on every device/browser combination.

## Suggested next improvements
- Add a small local backend to avoid browser CORS configuration
- Add export to Markdown
- Add task categories and recurring routines
- Add an optional Pomodoro timer

## Challenge submission notes
Before publishing, run the app, test at least three real tasks, capture a screenshot or short demo, and replace any untested claims with your measured results. Do not claim time saved unless you measured it.
