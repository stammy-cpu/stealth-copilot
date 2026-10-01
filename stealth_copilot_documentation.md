# Stealth Copilot — Complete Project Documentation

> **File:** [`stealth_copilot.py`](file:///c:/Users/nofiu/Downloads/TESTING%20OG/stealth_copilot.py)  
> **Location:** `c:\Users\nofiu\Downloads\TESTING OG\`  
> **Language:** Python 3.14  
> **Last updated:** September 2026

---

## 1. What Is This Project?

**Stealth Copilot** is a real-time, AI-powered interview assistant that runs invisibly on your Windows desktop as a floating overlay. It listens to your microphone, automatically detects when you finish speaking, transcribes your audio, and generates concise, role-specific bullet-point answers using a large language model — all within seconds, without ever appearing in screen recordings, Zoom calls, Teams meetings, or WebRTC streams.

### The Core Use Case

During a live job interview conducted over video call, the overlay sits on top of your screen. The interviewer cannot see it (it is hidden from screen capture at the OS level). When the interviewer asks a question, you speak your paraphrase of it. Within seconds, 3–4 bullet-point answers appear on the overlay in your own persona, ready to guide your spoken response.

### Persona

The copilot is pre-configured for **Fatai Olagoke Olanrewaju**, an AI Data Evaluator and Prompt Engineer with experience at RWS Group. All AI responses are generated in first-person as Fatai, citing his real work history, approval rates, and domain expertise. This persona is injected into every LLM system prompt.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     OVERLAY WINDOW (Qt)                       │
│  [START/STOP]  [General] [Coding] [STAR]  [Capture] [－]    │
│  ────────────────────────────────────────────────────────    │
│  [1] Audio source label          RMS: 312  [####--------]    │
│  [2] AI Response area (streaming tokens appear here)         │
└──────────────────────┬───────────────────────────────────────┘
                       │ Qt Signals (thread-safe)
            ┌──────────┴──────────┐
            │                     │
     ┌──────▼──────┐      ┌───────▼───────┐
     │ VADMonitor  │      │ PipelineWorker│
     │  (Thread)   │      │   (Thread)    │
     │             │      │               │
     │ sounddevice │      │ save_wav()    │
     │ InputStream │      │ transcribe()  │
     │ RMS checks  │─────►│ stream_bullets│
     │ State machine│     │               │
     └─────────────┘      └───────┬───────┘
                                  │
                       ┌──────────┴──────────┐
                       │      Groq API        │
                       │  whisper-large-v3    │  ← transcription
                       │  (chat model pool)   │  ← bullet generation
                       └─────────────────────┘
```

---

## 3. Feature Inventory

| Feature | Detail |
|---|---|
| **Stealth overlay** | Frameless, always-on-top PyQt5 window |
| **Screen capture hidden** | `WDA_EXCLUDEFROMCAPTURE` — invisible to Zoom, Teams, OBS, WebRTC |
| **No focus steal** | `WS_EX_NOACTIVATE` — keyboard stays in interview app |
| **Clickable buttons** | `WS_EX_TRANSPARENT` removed so UI controls work normally |
| **HWND_TOPMOST** | `SetWindowPos` enforces Z-order above maximised browsers |
| **VAD auto-trigger** | Detects speech → 1.2 s silence → auto-fires pipeline |
| **Auto-calibration** | 2 s ambient sample on startup sets noise floor dynamically |
| **Manual capture** | `Capture` button records a fixed 8-second clip |
| **Mode switching** | General / Coding / STAR (Behavioral) prompt modes |
| **Streaming response** | Tokens stream into overlay in real time (sub-second first paint) |
| **Conversation history** | Rolling 3-exchange context window fed to every LLM call |
| **Model fallback chain** | Tries 4 Groq models in order; uses first that responds |
| **Collapsible** | `－` collapses overlay to a 24×24 coloured dot; click to expand |
| **Draggable** | Click-drag anywhere on overlay to reposition |
| **Live RMS meter** | `RMS: 312  [####--------]` updates ~6x per second |
| **Error reporting** | Errors displayed inline in red on the overlay |

---

## 4. File Structure

```
c:\Users\nofiu\Downloads\TESTING OG\
├── stealth_copilot.py      ← Main application (945 lines)
├── test_audio.py           ← WASAPI device diagnostic
├── test_loopback.py        ← WasapiSettings loopback probe (device 8)
└── test_loopback2.py       ← Exhaustive channel/exclusive-mode loopback scanner
```

---

## 5. Dependencies

| Package | Purpose |
|---|---|
| `PyQt5` | GUI overlay window, signals, widgets |
| `groq` | Groq API client (Whisper + LLM) |
| `sounddevice` | Microphone capture and audio stream |
| `numpy` | Audio buffer arithmetic, RMS computation |
| `scipy` | Installed; no longer used after mic switch |
| `pynput` | Removed — replaced by Win32 hotkey, then removed entirely |
| `ctypes` | Win32 API calls (stdlib built-in) |

**Install all at once:**
```powershell
pip install PyQt5 groq sounddevice numpy scipy pynput
```

---

## 6. Configuration Reference

All constants live at lines 43–85 of [`stealth_copilot.py`](file:///c:/Users/nofiu/Downloads/TESTING%20OG/stealth_copilot.py):

```python
# Groq
GROQ_API_KEY     = "YOUR_GROQ_API_KEY_HERE"
GROQ_CHAT_MODELS = [
    "qwen/qwen3.8-27b",       # primary
    "openai/gpt-oss-120b",    # fallback 1
    "openai/gpt-oss-20b",     # fallback 2
    "allam-2-7b",             # fallback 3
]

# Audio
MIC_DEVICE_ID       = 1        # Microphone Array (Realtek) MME
MIC_SAMPLE_RATE     = 16_000   # 16 kHz — Whisper native rate, no resampling
MIC_CHANNELS        = 1        # Mono
MANUAL_RECORD_SECS  = 8        # Capture button clip length

# VAD
VAD_CALIBRATION_SECS       = 2.0      # ambient noise sample on startup
VAD_CALIBRATION_MULTIPLIER = 3.0      # threshold = baseline_rms x 3
VAD_CALIBRATION_MIN        = 400/32767 # absolute minimum (float32)
VAD_CALIBRATION_MAX        = 2000/32767 # ceiling for noisy rooms
VAD_SILENCE_SECS           = 1.2      # silence duration to end utterance
VAD_MIN_SPEECH_SECS        = 0.4      # minimum utterance to process
VAD_MAX_SPEECH_SECS        = 30       # hard cap before auto-fire

# Window
WIN_X, WIN_Y   = 300, 50       # screen position in pixels
WIN_W, WIN_H   = 800, 180      # overlay dimensions
DOT_SIZE       = 24            # collapsed dot size

# Conversation
HISTORY_MAX    = 3             # rolling exchange pairs injected into LLM
```

---

## 7. The Three Interview Modes

Switch with the pill buttons in the toolbar:

### `[General]` — Video AI / Annotation Strategy
For Video AI Evaluation and annotation strategy questions. Topics include attention-to-detail assessments, action success judgment, video comparison reasoning, and annotation correction. Output: 2–4 bullets, max 15–20 words each, first-person as Fatai.

### `[Coding]` — Technical / Python / Metrics
For technical, Python, or quality-metrics questions related to AI evaluation workflows. Topics: script logic, precision/recall/F1, data quality pipelines. Output: 3–4 bullets, max 18 words each.

### `[STAR]` — Behavioral / Situational
Forces STAR format (Situation, Action 1, Action 2, Result) drawing on Fatai's specific history at RWS Group. Exactly 4 bullets with strict per-bullet word limits. Speakable, first-person sentences.

---

## 8. How It Works — Step by Step

### Startup Sequence

```
main()
  ├─ resolve_model()          probe Groq API, pick first working chat model
  ├─ PipelineWorker.start()   background thread, waits for audio submissions
  ├─ VADMonitor.start()       background thread:
  │    ├─ resolve_audio()     probe device 1 (mic), fallback to default input
  │    ├─ calibrate_vad()     record 2 s ambient, compute threshold
  │    └─ sd.InputStream()    opens live audio stream (VAD callback fires per chunk)
  └─ OverlayWindow.show()     draws overlay, applies Win32 stealth flags
```

### Auto-VAD Pipeline (when armed)

```
Microphone audio (16 kHz, 1024-frame chunks)
  │
  ▼  _cb() [sounddevice audio thread callback]
  │  • Compute RMS of chunk
  │  • Update live RMS meter every 6 chunks
  │  • VAD state machine:
  │      IDLE ──(RMS > threshold)──► SPEAKING  buffer chunks
  │      SPEAKING ──(RMS < threshold)──► TRAILING  wait 1.2 s
  │      TRAILING ──(silence >= 1.2 s)──► FIRE
  │
  ▼  VADMonitor._fire()
  │  bridge.update_status("THINKING")
  │  worker.submit(frames, cfg)
  │
  ▼  PipelineWorker.run()
  │  save_wav(frames)       float32 → int16 WAV @ 16 kHz
  │  transcribe(wav)        Groq Whisper (whisper-large-v3-turbo)
  │  stream_bullets()       Groq LLM with persona + mode prompt + history
  │    each token ─────────► bridge.update_stream ──► overlay label appends
  │  history.add(transcript, full_response)
  └─ bridge.update_status("LISTENING")
```

### Manual Capture (`Capture` button)

```
Click Capture button
  └─ VADMonitor.manual_capture() [spawned thread]
       sd.rec(8 s) → worker.submit([audio], cfg, "MANUAL")
       → same pipeline as VAD auto-trigger
```

---

## 9. Win32 Stealth Implementation

```python
# Applied in OverlayWindow._apply_win32_styles()

# 1. Extended window styles
ex |= WS_EX_LAYERED     # 0x00080000 — required for translucency + affinity API
ex |= WS_EX_NOACTIVATE  # 0x08000000 — never steals keyboard focus

# Note: WS_EX_TRANSPARENT (0x00000020) was present in earlier iterations
#       but removed — it blocks all mouse clicks, making buttons unusable.

# 2. Screen capture exclusion
SetWindowDisplayAffinity(hwnd, 0x00000011)  # WDA_EXCLUDEFROMCAPTURE
# Overlay is invisible to:
#   Zoom screen share, Teams screen share, Google Meet / WebRTC
#   OBS Studio, Windows Game Bar (Win+G)
#   Any app reading the display framebuffer

# 3. Always-on-top Z-order (stronger than Qt flag)
SetWindowPos(hwnd, HWND_TOPMOST, x, y, w, h, SWP_NOACTIVATE | SWP_SHOWWINDOW)
# Stays above maximised Chrome, Zoom, IDEs, even fullscreen apps
```

---

## 10. Audio Engine History and Evolution

The audio capture engine went through four iterations:

### Iteration 1 — Hardcoded WASAPI Device ID 8
Targeted `Speaker (Realtek(R) Audio)` as device 8 using `sd.rec()`.  
**Problem:** Device 8 has `max_input_channels: 0` — PortAudio cannot open an output-only device as an input stream.

### Iteration 2 — WASAPI Probe with `exclusive=False`
Used `sd.WasapiSettings(exclusive=False)` hoping it would enable loopback.  
**Problem:** `exclusive=False` does NOT enable loopback mode. All channel counts returned `PaErrorCode -9998`. Diagnostic confirmed no Stereo Mix on this system.

### Iteration 3 — `loopback=True` + scipy Resampling
Correct WASAPI flag: `sd.WasapiSettings(loopback=True)`. Captured at native 48 kHz stereo, resampled to 16 kHz mono via `scipy.signal.resample`.  
**Problem:** The Realtek driver on this machine still blocks `loopback=True` because `max_input_channels` for the speaker is 0. PortAudio cannot open it regardless of the flag.

### Iteration 4 — Direct Microphone Capture (Current)
- Device: `Microphone Array (Realtek(R) Audio)` — Device ID 1 (MME) / 9 (WASAPI)
- Captured directly at **16,000 Hz mono** — Whisper's native rate
- **No resampling** — scipy entirely removed from the pipeline
- VAD threshold auto-calibrated from a 2-second ambient noise sample at startup
- RMS threshold lowered to `300/32767` — appropriate for close-mic input levels

### Diagnostic Tools Created

| Script | Purpose |
|---|---|
| [`test_audio.py`](file:///c:/Users/nofiu/Downloads/TESTING%20OG/test_audio.py) | Lists all 26 audio devices, records 3 s from each WASAPI input, prints RMS bar chart, recommends best device ID |
| [`test_loopback.py`](file:///c:/Users/nofiu/Downloads/TESTING%20OG/test_loopback.py) | Tests `WasapiSettings(exclusive=False)` on device 8 with channel counts 1, 2 |
| [`test_loopback2.py`](file:///c:/Users/nofiu/Downloads/TESTING%20OG/test_loopback2.py) | Exhaustive scan: every WASAPI output device x every channel count x exclusive/shared |

**Key diagnostic result:**
```
Device 8 — Speaker (Realtek(R) Audio)
  hostapi:              2  (Windows WASAPI)
  max_input_channels:   0  ← cannot be opened as input by PortAudio
  max_output_channels:  2
  default_samplerate:   48000 Hz

No Stereo Mix device found (disabled in Windows Sound settings)
PyAudio build failed (Python 3.14 + no portaudio.h)
```

---

## 11. Hotkey History

| Version | Trigger | Implementation |
|---|---|---|
| v1 | `Ctrl+Shift+A` | `pynput.keyboard.Listener` background thread |
| v2 | `Ctrl+Alt+K` | `pynput.keyboard.Listener` background thread |
| v3 | `F8` system-wide | `Win32 RegisterHotKey(None, 1, MOD_NONE, VK_F8)` + `GetMessage` loop |
| v4 current | `Capture` button | All keyboard hotkeys removed; button calls `VADMonitor.manual_capture()` |

---

## 12. UI Component Reference

```
┌─────────────────────────────────────── 800 px ────────────────┐
│ [START COPILOT] | [General] [Coding] [STAR]  STATUS | [Capture] [－] │
│ ─────────────────────────────────────────────────────────────  │
│ audio source label                    RMS: 312  [####--------] │
│ ─────────────────────────────────────────────────────────────  │
│ AI response area  (streaming, word-wrap, min 110 px height)    │
└───────────────────────────────────────────────────────────────┘
```

| Widget | Role | Behaviour |
|---|---|---|
| `btn_arm` | START / STOP button | Toggles VAD armed state; green START → red STOP on activation |
| `_mode_btns` | General / Coding / STAR | Pill selector; active = blue, inactive = dim ghost |
| `status_lbl` | Status pill | `● OFF` / `⟳ CALIBRATING` / `⏺ LISTENING` / `⏺ SPEAKING` / `✦ THINKING` |
| `btn_capture` | Manual capture | Records 8 s immediately on click |
| `btn_hide` | Collapse button (－) | Shrinks window to a 24 px coloured dot |
| `dot` | Collapsed indicator | Green=OFF, Red=active, Blue=thinking; click to expand |
| `src_lbl` | Audio source label | Resolved device string shown after startup |
| `rms_lbl` | Live RMS bar | `RMS: NNN  [####--------]` at ~6 Hz |
| `response` | AI output area | Tokens streamed in real time; errors appear in red |

---

## 13. Running the Application

### Standard Launch
```powershell
$env:GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE"
python stealth_copilot.py
```

### Kill Existing Instance
```powershell
Stop-Process -Name python -Force -ErrorAction SilentlyContinue
```

### Run Audio Diagnostic
```powershell
$env:PYTHONIOENCODING = "utf-8"
python -X utf8 test_audio.py
```

---

## 14. Conversation History System

`ConversationHistory` is a thread-safe rolling deque holding the last `HISTORY_MAX = 3` question/answer pairs.

```
Messages sent to LLM on each call:
  system   : <mode prompt with full Fatai persona>
  user     : exchange 1 question   (oldest)
  assistant: exchange 1 answer
  user     : exchange 2 question
  assistant: exchange 2 answer
  user     : exchange 3 question
  assistant: exchange 3 answer
  user     : current transcript    (newest)
```

This gives the LLM memory of the ongoing interview — follow-up questions are answered in context. History resets on app restart, persists across VAD triggers within a session.

---

## 15. Groq API Usage

### Transcription
```python
GROQ_CLIENT.audio.transcriptions.create(
    file=(filename, file_obj, "audio/wav"),
    model="whisper-large-v3-turbo",
    response_format="text",
)
```
- Input: 16 kHz mono WAV temp file (deleted immediately after upload)
- Output: plain text transcript string

### Chat / Bullet Generation (Streaming)
```python
GROQ_CLIENT.chat.completions.create(
    model=_CHAT_MODEL,     # resolved at startup
    messages=messages,     # system + history + transcript
    max_tokens=200,
    temperature=0.5,
    stream=True,           # tokens emitted to overlay in real time
)
```

### Model Fallback — `resolve_model()`
Called once at startup. Pings each model in `GROQ_CHAT_MODELS` with a 1-token test; uses the first to respond successfully. Raises `RuntimeError` if none respond.

---

## 16. Key Design Decisions

| Decision | Rationale |
|---|---|
| **PyQt5 over tkinter** | Native compositing, `WA_TranslucentBackground`, `winId()` for Win32 access |
| **Daemon threads** | All threads are `daemon=True` — die automatically with main process |
| **Qt signal bridge** | All cross-thread UI updates use `pyqtSignal` — prevents Qt object race conditions |
| **`deque(maxlen=1)` queue** | Drops stale captures if pipeline is busy — no backlog during rapid speech |
| **Temp WAV then delete** | Audio never stored permanently; `os.remove()` runs after Groq upload |
| **16 kHz direct capture** | Whisper native rate — zero resampling, zero quality loss |
| **Auto-calibrating VAD** | Fixed thresholds break in different rooms; 2 s ambient sample adapts dynamically |
| **`WS_EX_NOACTIVATE` retained** | Keypresses during interview go to interview app, not the overlay |
| **`WS_EX_TRANSPARENT` removed** | Click-through is incompatible with clickable buttons |
| **`SetWindowPos(HWND_TOPMOST)`** | More reliable than Qt's `WindowStaysOnTopHint` against maximised windows |

---

## 17. Known Limitations

| Limitation | Detail |
|---|---|
| **Microphone only** | Speaker loopback unavailable — Realtek driver blocks it, Stereo Mix not enabled |
| **Python 3.14** | PyAudio build fails (no portaudio.h); limits loopback workaround options |
| **Fixed screen position** | Pixel coordinates — may need repositioning on different display sizes |
| **English default** | Whisper transcribes English by default; add `language="xx"` for other languages |
| **API key in source** | Key hardcoded in script; use `$env:GROQ_API_KEY` or `.env` for production |
| **VAD mic bleed** | Loud speaker audio can bleed into mic and trigger VAD — raise `VAD_CALIBRATION_MULTIPLIER` |

---

## 18. Quick-Start Checklist

- [ ] Python installed and on PATH
- [ ] `pip install PyQt5 groq sounddevice numpy scipy` done
- [ ] Groq API key available
- [ ] Microphone set as default Windows input
- [ ] Run `python -X utf8 test_audio.py` to confirm device and RMS level
- [ ] Confirm `MIC_DEVICE_ID` in script matches working device from diagnostic
- [ ] Launch: `$env:GROQ_API_KEY="..."; python stealth_copilot.py`
- [ ] Click **START COPILOT** to arm VAD
- [ ] Select mode: **General**, **Coding**, or **STAR**
- [ ] Speak a question — overlay streams AI answer within ~3 seconds

---

*Documentation generated September 2026. Final script: `stealth_copilot.py` — 945 lines, 38.7 KB.*
