# Stealth Copilot

AI-powered interview co-pilot — cloud-synced desktop client + web control panel.

## Architecture

```
stealth_copilot.py   ← Desktop overlay (PyQt5 + Groq + Supabase Realtime)
copilot-web/         ← Next.js 14 control panel (Supabase Auth + Groq AI)
build_installer.py   ← PyInstaller packaging script
installer_config.iss ← Inno Setup installer script
db_init.py           ← Supabase schema initialisation
```

## Stack

| Layer | Tech |
|---|---|
| Desktop Client | Python 3, PyQt5, Groq SDK, Supabase Realtime |
| Web Panel | Next.js 14 (App Router), Tailwind CSS, Supabase SSR |
| AI | Groq `llama-3.3-70b-versatile` + `whisper-large-v3-turbo` |
| Database | Supabase (PostgreSQL + Realtime + RLS) |
| Packaging | PyInstaller + Inno Setup 6 |

## Setup

### Desktop client

```bash
pip install PyQt5 groq supabase sounddevice numpy pyaudio websockets
python stealth_copilot.py
```

### Web control panel

```bash
cd copilot-web
npm install
# Set SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY in .env.local
npm run dev
```

### Build installer

```bash
python build_installer.py
# then: iscc.exe installer_config.iss
```

## Hotkeys

| Key | Action |
|---|---|
| `Ctrl+Enter` | Force-trigger VAD immediately |
| `Escape` | Cancel active LLM stream |

## Features

- 🔐 Supabase email + Google OAuth
- ⚡ Realtime profile sync — change profile in web, desktop updates instantly
- 🎙️ 3-tier syntax-aware VAD (1.5s / profile / 3.5s dynamic endpointing)
- 🥷 WDA_EXCLUDEFROMCAPTURE — invisible to Zoom, Teams, OBS
- 🤖 Groq streaming with mid-stream Escape cancellation
- 📄 AI profile generator (CV + JD → system prompt + 5 anchor stories)
