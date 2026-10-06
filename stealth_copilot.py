"""
Stealth Copilot v2 — Cloud-Synced Desktop Client
=================================================
All interview configuration (system prompt, VAD thresholds, max_tokens,
temperature) is loaded live from Supabase instead of being hard-coded.

Startup flow:
  1. Connect to Supabase using anon key (no login required).
  2. Fetch latest active_sessions row → load linked interview_profiles row.
  3. Subscribe to Supabase Realtime (active_sessions) via WebSockets.
  4. On profile-change event → hot-swap ProfileConfig in memory (no restart).

Stealth engine preserved:
  • WDA_EXCLUDEFROMCAPTURE (invisible to Zoom / Teams / WebRTC / OBS)
  • HWND_TOPMOST + WS_EX_NOACTIVATE + WS_EX_LAYERED
  • Dynamic overlay auto-height (adjust_overlay_height)
  • Syntax-aware 3-tier VAD endpointing (1.5s / dynamic / 3.5s)
  • Groq streaming + mid-stream cancellation (Escape hotkey)
  • Ctrl+Enter force-trigger, Win32 RegisterHotKey (no focus steal)
"""

from __future__ import annotations

import os
import sys
import ctypes
import ctypes.wintypes
import threading
import collections
import time
import wave
import tempfile
import asyncio
import json

import numpy as np
import sounddevice as sd

from PyQt5.QtWidgets import (
    QApplication, QLabel, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QFrame, QSizePolicy, QDialog, QLineEdit, QMessageBox,
)
from PyQt5.QtCore import Qt, QObject, pyqtSignal
from PyQt5.QtGui  import QFont, QCursor

from groq import Groq
from supabase import create_client, Client as SupabaseClient

# ─── Load .env file if present ────────────────────────────────────────────────
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())
    print(f"[Config] Loaded .env from {_env_path}")

# ─── Supabase Credentials ──────────────────────────────────────────────────────

SUPABASE_URL      = os.environ.get(
    "SUPABASE_URL",
    "https://fsmavohjwxhyihpqnofn.supabase.co",
)
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWF2b2hqd3hoeWlocHFub2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzcxMjcsImV4cCI6MjEwNjQ1MzEyN30.RKCCDJSHSa6ZB0g7ujCjmfeZ5DcfDjHriAYRORDRpNY")
)


# ─── Groq Credentials ──────────────────────────────────────────────────────────

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")  # loaded from .env above
GROQ_CLIENT = Groq(api_key=GROQ_API_KEY)

GROQ_CHAT_MODELS = [
    "openai/gpt-oss-120b",   # highest quality — try first
    "openai/gpt-oss-20b",    # faster fallback
    "qwen/qwen3.8-27b",      # Qwen fallback
    "allam-2-7b",             # last resort
]


# ─── Audio Constants ──────────────────────────────────────────────────────────

CHUNK_FRAMES = 1024
MIC_DEVICE_ID   = 1
MIC_SAMPLE_RATE = 16_000
MIC_CHANNELS    = 1
TARGET_SAMPLE_RATE = MIC_SAMPLE_RATE

# VAD calibration
VAD_CALIBRATION_SECS       = 2.0
VAD_CALIBRATION_MULTIPLIER = 3.0
VAD_CALIBRATION_MIN        = 400  / 32767
VAD_CALIBRATION_MAX        = 2000 / 32767
VAD_MIN_SPEECH_SECS        = 0.4
VAD_MAX_SPEECH_SECS        = 30

# Silence-tier constants (Tier 1 / Tier 3 stay fixed; Tier 2 = profile value)
VAD_SECS_LONG  = 3.5    # trailing conjunction — interviewer mid-thought
VAD_SECS_FAST  = 1.5    # complete question — fire quickly

RMS_UPDATE_EVERY_N_CHUNKS = 6
MANUAL_RECORD_SECS        = 8

# Window geometry
WIN_X, WIN_Y = 300, 50
WIN_W, WIN_H = 800, 180
DOT_SIZE     = 24

# Win32 constants
WS_EX_LAYERED          = 0x00080000
WS_EX_NOACTIVATE       = 0x08000000
GWL_EXSTYLE            = -20
WDA_EXCLUDEFROMCAPTURE = 0x00000011
HWND_TOPMOST           = -1
SWP_NOACTIVATE         = 0x0010
SWP_SHOWWINDOW         = 0x0040

STATUS_META = {
    "OFF":         ("● OFF",         "rgba(150,150,180,200)"),
    "CALIBRATING": ("⟳ CALIBRATING", "rgba(255,200, 60,210)"),
    "LISTENING":   ("⏺ LISTENING",   "rgba( 60,210,120,230)"),
    "SPEAKING":    ("⏺ SPEAKING",    "rgba(255, 90, 70,240)"),
    "THINKING":    ("✦ THINKING",    "rgba(100,180,255,230)"),
    "SYNCING":     ("⇄ SYNCING",     "rgba(180,130,255,230)"),
}


# ══════════════════════════════════════════════════════════════════════════════
# PROFILE CONFIG — thread-safe live configuration container
# ══════════════════════════════════════════════════════════════════════════════

class ProfileConfig:
    """
    Thread-safe container for the active interview profile.
    Updated in-place by RealtimeSyncThread whenever Supabase fires a
    postgres_changes event on active_sessions.
    """

    _DEFAULT_PROMPT = (
        "You are a helpful AI interview co-pilot.\n"
        "No active profile is currently loaded.\n"
        "Please open the Stealth Copilot web panel (http://localhost:3000),\n"
        "go to Profile Manager, and click 'Set as Active' on a profile."
    )

    def __init__(self) -> None:
        self._lock             = threading.RLock()
        self._system_prompt    = self._DEFAULT_PROMPT
        self._max_tokens       = 380
        self._temperature      = 0.45
        self._vad_default_secs = 2.2   # neutral silence tier (profile-driven)
        self._role_title       = "No Profile Loaded"
        self._profile_id: str | None = None

    # ── Update (called from background thread) ────────────────────────────────

    def update_from_profile(self, profile: dict) -> None:
        with self._lock:
            self._system_prompt    = profile.get("system_prompt") or self._DEFAULT_PROMPT
            self._max_tokens       = int(profile.get("max_tokens")            or 380)
            self._temperature      = float(profile.get("temperature")          or 0.45)
            self._vad_default_secs = float(profile.get("vad_silence_threshold") or 2.2)
            self._role_title       = profile.get("role_title") or "Unknown Role"
            self._profile_id       = profile.get("id")
        print(f"[Config] Profile hot-swapped → {self._role_title!r}")

    def clear(self) -> None:
        with self._lock:
            self.__init__()  # reset to defaults

    # ── Read properties ───────────────────────────────────────────────────────

    @property
    def system_prompt(self) -> str:
        with self._lock: return self._system_prompt

    @property
    def max_tokens(self) -> int:
        with self._lock: return self._max_tokens

    @property
    def temperature(self) -> float:
        with self._lock: return self._temperature

    @property
    def vad_default_secs(self) -> float:
        with self._lock: return self._vad_default_secs

    @property
    def role_title(self) -> str:
        with self._lock: return self._role_title

    @property
    def profile_id(self) -> str | None:
        with self._lock: return self._profile_id

    @property
    def is_loaded(self) -> bool:
        with self._lock: return self._profile_id is not None


# ── Global singleton — shared across all components ───────────────────────────
profile_cfg = ProfileConfig()


# ══════════════════════════════════════════════════════════════════════════════
# SUPABASE REALTIME SYNC THREAD
# ══════════════════════════════════════════════════════════════════════════════

class RealtimeSyncThread(threading.Thread):
    """
    Subscribes to Supabase Realtime postgres_changes on active_sessions.
    No login required — uses anon key only. Loads the most recently
    updated session on startup, then watches for live changes from the
    web wizard and auto-expands the overlay via bridge.session_activated.
    """

    def __init__(
        self,
        supabase: SupabaseClient,
        bridge: "Bridge",
    ) -> None:
        super().__init__(daemon=True, name="RealtimeSyncThread")
        self.supabase = supabase
        self.bridge   = bridge
        self._stop_event = threading.Event()

    # ── Fetch a profile row and apply it ─────────────────────────────────────

    def _fetch_and_apply(self, profile_id: str | None) -> None:
        if not profile_id:
            return
        try:
            resp = (
                self.supabase
                    .from_("interview_profiles")
                    .select("*")
                    .eq("id", profile_id)
                    .single()
                    .execute()
            )
            if resp.data:
                profile_cfg.update_from_profile(resp.data)
                self.bridge.profile_updated.emit(resp.data.get("role_title", ""))
        except Exception as exc:
            print(f"[Realtime] Profile fetch error: {exc}")

    # ── Initial load (REST, before Realtime socket opens) ────────────────────

    def _initial_load(self) -> None:
        """Load the most recently updated active session (no user_id filter)."""
        try:
            self.bridge.update_status.emit("SYNCING")
            resp = (
                self.supabase
                    .from_("active_sessions")
                    .select("active_profile_id")
                    .order("updated_at", desc=True)
                    .limit(1)
                    .execute()
            )
            rows = resp.data or []
            if rows:
                self._fetch_and_apply(rows[0].get("active_profile_id"))
        except Exception as exc:
            print(f"[Realtime] Initial load error: {exc}")

    # ── Async Realtime subscription ───────────────────────────────────────────

    async def _subscribe_async(self) -> None:
        from realtime import AsyncRealtimeClient

        realtime_url = (
            SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1"
        )
        print(f"[Realtime] Connecting to {realtime_url} ...")

        client = AsyncRealtimeClient(realtime_url, SUPABASE_KEY)

        try:
            await client.connect()
        except Exception as exc:
            print(f"[Realtime] WebSocket connect failed: {exc}")
            return

        channel = client.channel("active_sessions_watch")

        def _on_change(payload: dict) -> None:
            record     = payload.get("record") or payload.get("new") or {}
            profile_id = record.get("active_profile_id")
            print(f"[Realtime] active_sessions change → profile_id={profile_id}")
            threading.Thread(
                target=self._fetch_and_apply,
                args=(profile_id,),
                daemon=True,
            ).start()
            # Auto-expand the overlay — web wizard just fired a new session
            self.bridge.session_activated.emit()

        channel.on_postgres_changes(
            event="*",
            schema="public",
            table="active_sessions",
            # No user_id filter — single-user tool, listen to all changes
            callback=_on_change,
        )

        await channel.subscribe()
        print("[Realtime] Subscribed — watching active_sessions (no login required).")

        # Keep the loop alive; SDK handles heartbeats internally
        while not self._stop_event.is_set():
            await asyncio.sleep(5)

        await client.close()

    # ── Thread entry point ────────────────────────────────────────────────────

    def run(self) -> None:
        self._initial_load()
        try:
            asyncio.run(self._subscribe_async())
        except Exception as exc:
            print(f"[Realtime] Fatal error: {exc}")

    def stop(self) -> None:
        self._stop_event.set()


# ══════════════════════════════════════════════════════════════════════════════
# SIGNAL BRIDGE
# ══════════════════════════════════════════════════════════════════════════════

class Bridge(QObject):
    update_text       = pyqtSignal(str)    # replace overlay text completely
    update_stream     = pyqtSignal(str)    # append streaming token
    update_status     = pyqtSignal(str)    # status key → STATUS_META
    update_src        = pyqtSignal(str)    # audio device label
    update_rms        = pyqtSignal(float)  # live RMS value
    cancel_stream     = pyqtSignal()       # Escape hotkey → kill active generation
    profile_updated   = pyqtSignal(str)   # role_title → refresh overlay header
    session_activated = pyqtSignal()      # web wizard fired → auto-expand overlay


# ══════════════════════════════════════════════════════════════════════════════
# AUDIO ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class AudioConfig:
    def __init__(self, device_id, sample_rate: int, channels: int, label: str):
        self.device_id   = device_id
        self.sample_rate = sample_rate
        self.channels    = channels
        self.label       = label


def resolve_audio() -> AudioConfig:
    for dev_id in (MIC_DEVICE_ID, sd.default.device[0]):
        try:
            info  = sd.query_devices(dev_id, "input")
            name  = info["name"]
            test  = sd.rec(int(0.1 * MIC_SAMPLE_RATE), samplerate=MIC_SAMPLE_RATE,
                           channels=MIC_CHANNELS, dtype="float32", device=dev_id)
            sd.wait()
            label = f"[{dev_id}] {name[:42]}  {MIC_SAMPLE_RATE}Hz/mono"
            print(f"[Audio] Using: {label}")
            return AudioConfig(dev_id, MIC_SAMPLE_RATE, MIC_CHANNELS, label)
        except Exception as e:
            print(f"[Audio] Device {dev_id} failed: {e}")

    label = f"Default input  {MIC_SAMPLE_RATE}Hz/mono"
    return AudioConfig(None, MIC_SAMPLE_RATE, MIC_CHANNELS, label)


def calibrate_vad(cfg: AudioConfig) -> float:
    print(f"[VAD] Calibrating {VAD_CALIBRATION_SECS:.1f}s ambient sample ...")
    try:
        audio    = sd.rec(int(VAD_CALIBRATION_SECS * cfg.sample_rate),
                          samplerate=cfg.sample_rate, channels=cfg.channels,
                          dtype="float32", device=cfg.device_id)
        sd.wait()
        baseline = float(np.sqrt(np.mean(audio.ravel().astype(np.float64) ** 2)))
        thr      = max(VAD_CALIBRATION_MIN, min(baseline * VAD_CALIBRATION_MULTIPLIER, VAD_CALIBRATION_MAX))
        print(f"[VAD] OK  baseline={int(baseline*32767)}  threshold={int(thr*32767)}")
        return thr
    except Exception as e:
        print(f"[VAD] Calibration failed ({e}). Fallback={int(VAD_CALIBRATION_MIN*32767)}")
        return VAD_CALIBRATION_MIN


def save_wav(frames: list, cfg: AudioConfig) -> str:
    audio    = np.concatenate(frames)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio_i16 = (audio * 32767).clip(-32768, 32767).astype(np.int16)
    secs      = len(audio_i16) / cfg.sample_rate
    print(f"[Audio] WAV {secs:.2f}s  {len(audio_i16)} samples @ {cfg.sample_rate}Hz")
    tmp  = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    path = tmp.name; tmp.close()
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2)
        wf.setframerate(TARGET_SAMPLE_RATE)
        wf.writeframes(audio_i16.tobytes())
    return path


# ══════════════════════════════════════════════════════════════════════════════
# GROQ PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

_CHAT_MODEL: str = ""


def resolve_model() -> str:
    """Probe each model with a 1-token ping. Falls back non-fatally if all fail."""
    for model in GROQ_CHAT_MODELS:
        try:
            GROQ_CLIENT.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
            )
            print(f"[Groq] Using model: {model}")
            return model
        except Exception as e:
            print(f"[Groq] Model {model} unavailable: {e}")
    # Non-fatal — overlay still starts; will retry/fail on first generation
    fallback = GROQ_CHAT_MODELS[0]
    print(f"[Groq] WARNING: All models unreachable at startup — defaulting to {fallback}. Will retry on first use.")
    return fallback


def transcribe(wav_path: str) -> str:
    print("[Groq] Transcribing ...")
    with open(wav_path, "rb") as f:
        result = GROQ_CLIENT.audio.transcriptions.create(
            file=(os.path.basename(wav_path), f, "audio/wav"),
            model="whisper-large-v3-turbo",
            response_format="text",
        )
    text  = result if isinstance(result, str) else getattr(result, "text", str(result))
    short = f"{text[:80]}..." if len(text) > 80 else text
    print(f"[Groq] Transcript ({len(text)} chars): {short}")
    return text.strip()


# ── Syntax-aware VAD endpointing ──────────────────────────────────────────────

def get_dynamic_silence_threshold(transcript_text: str) -> float:
    """
    3-tier silence detection:
      Tier 1 — trailing conjunction / filler  →  VAD_SECS_LONG  (3.5s)
      Tier 2 — complete question detected     →  VAD_SECS_FAST  (1.5s)
      Tier 3 — neutral / declarative         →  profile_cfg.vad_default_secs
    """
    text = transcript_text.strip().lower() if transcript_text else ""
    if not text:
        return profile_cfg.vad_default_secs

    words     = text.split()
    last_word = words[-1].strip(".,?!") if words else ""

    incomplete = {
        "and", "or", "because", "so", "if", "but", "like",
        "when", "where", "which", "um", "uh", "you", "know",
        "that", "then", "while", "as", "with", "for",
    }
    if last_word in incomplete or text.endswith(","):
        print(f"[VAD] Incomplete indicator '{last_word}' → long wait {VAD_SECS_LONG}s")
        return VAD_SECS_LONG

    question_starters = (
        "how", "what", "why", "can you", "could you",
        "tell me", "have you", "describe", "walk me", "explain",
    )
    ends_with_q  = text.endswith("?")
    starts_with_q = any(text.startswith(s) for s in question_starters)
    if ends_with_q or (starts_with_q and len(words) > 4):
        print(f"[VAD] Complete question → fast trigger {VAD_SECS_FAST}s")
        return VAD_SECS_FAST

    return profile_cfg.vad_default_secs


# ── Streaming LLM call ────────────────────────────────────────────────────────

def stream_bullets(transcript: str, bridge: Bridge, worker: "PipelineWorker") -> str:
    """
    Stateless single-turn: reads system_prompt, max_tokens, temperature
    from the live ProfileConfig singleton — no restart needed on profile change.
    Checks worker._cancel_flag on every token to support Escape cancellation.
    """
    global _CHAT_MODEL
    prompt = profile_cfg.system_prompt
    tokens = profile_cfg.max_tokens
    temp   = profile_cfg.temperature

    print(f"[Groq] Streaming (model={_CHAT_MODEL}, role={profile_cfg.role_title!r}) ...")

    stream = GROQ_CLIENT.chat.completions.create(
        model=_CHAT_MODEL,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user",   "content": transcript},
        ],
        max_tokens=tokens,
        temperature=temp,
        stream=True,
    )

    full_response = ""
    first_token   = True
    for chunk in stream:
        with worker._lock:
            if worker._cancel_flag:
                print("[Groq] Stream cancelled.")
                break
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if not delta:
            continue
        if first_token:
            bridge.update_text.emit("")   # clear overlay on first token
            first_token = False
        full_response += delta
        bridge.update_stream.emit(delta)

    print(f"[Groq] Done ({len(full_response)} chars).")
    return full_response.strip()


# ══════════════════════════════════════════════════════════════════════════════
# PIPELINE WORKER
# ══════════════════════════════════════════════════════════════════════════════

class PipelineWorker(threading.Thread):
    """
    Stateless single-turn pipeline.
    Supports mid-stream cancellation (cancel_flag) and transcript feedback to VAD.
    """

    def __init__(self, bridge: Bridge) -> None:
        super().__init__(daemon=True)
        self.bridge       = bridge
        self._lock        = threading.Lock()
        self._busy        = False
        self._cancel_flag = False
        self._queue: collections.deque = collections.deque(maxlen=1)
        self._event       = threading.Event()
        self._vad: "VADMonitor | None" = None
        bridge.cancel_stream.connect(self.cancel)

    def set_vad(self, vad: "VADMonitor") -> None:
        self._vad = vad

    def cancel(self) -> None:
        with self._lock:
            self._cancel_flag = True
        self.bridge.update_text.emit("")
        self.bridge.update_status.emit("LISTENING" if (self._vad and self._vad.armed) else "OFF")
        print("[Worker] Cancel requested.")

    def submit(self, frames: list, cfg: AudioConfig, label: str = "") -> None:
        with self._lock:
            if self._busy:
                print("[Worker] Busy — drop.")
                return
            self._cancel_flag = False
        self._queue.append((frames, cfg, label))
        self._event.set()

    @property
    def busy(self) -> bool:
        with self._lock:
            return self._busy

    def run(self) -> None:
        while True:
            self._event.wait(); self._event.clear()
            if not self._queue:
                continue
            frames, cfg, label = self._queue.popleft()
            with self._lock:
                self._busy = True
                self._cancel_flag = False
            try:
                self.bridge.update_status.emit("THINKING")
                wav        = save_wav(frames, cfg)
                transcript = transcribe(wav)
                try:
                    os.remove(wav)
                except OSError:
                    pass

                if not transcript:
                    self.bridge.update_text.emit("(No speech detected — try again)")
                    self.bridge.update_status.emit("LISTENING")
                    continue

                if self._vad is not None:
                    self._vad.set_last_transcript(transcript)

                with self._lock:
                    cancelled = self._cancel_flag
                if cancelled:
                    self.bridge.update_status.emit("LISTENING")
                    continue

                if not profile_cfg.is_loaded:
                    self.bridge.update_text.emit(
                        "[No profile] — set an active profile in the web panel first."
                    )
                    self.bridge.update_status.emit("LISTENING")
                    continue

                full = stream_bullets(transcript, self.bridge, self)
                if not full:
                    self.bridge.update_text.emit("(Groq returned empty — retry)")
                    self.bridge.update_status.emit("LISTENING")
                    continue

                self.bridge.update_status.emit("LISTENING")

            except Exception as exc:
                self.bridge.update_text.emit(f"[ERROR] {exc}")
                self.bridge.update_status.emit("LISTENING")
                print(f"[Worker] Error: {exc}")
            finally:
                with self._lock:
                    self._busy = False


# ══════════════════════════════════════════════════════════════════════════════
# VAD MONITOR
# ══════════════════════════════════════════════════════════════════════════════

class VADMonitor(threading.Thread):

    _IDLE     = "IDLE"
    _SPEAKING = "SPEAKING"
    _TRAILING = "TRAILING"

    def __init__(self, worker: PipelineWorker, bridge: Bridge) -> None:
        super().__init__(daemon=True)
        self.worker              = worker
        self.bridge              = bridge
        self._cfg: AudioConfig | None = None
        self._threshold          = VAD_CALIBRATION_MIN
        self._armed              = False
        self._lock               = threading.Lock()
        self._last_transcript    = ""
        self._force_trigger      = threading.Event()

    # ── Arm / disarm ──────────────────────────────────────────────────────────

    def arm(self) -> None:
        with self._lock:
            self._armed = True
        self.bridge.update_status.emit("LISTENING")
        print("[VAD] Armed.")

    def disarm(self) -> None:
        with self._lock:
            self._armed = False
        self.bridge.update_status.emit("OFF")
        print("[VAD] Disarmed.")

    @property
    def armed(self) -> bool:
        with self._lock:
            return self._armed

    def set_last_transcript(self, text: str) -> None:
        with self._lock:
            self._last_transcript = text

    def force_trigger_now(self) -> None:
        self._force_trigger.set()
        print("[VAD] Force trigger requested.")

    # ── Manual capture ────────────────────────────────────────────────────────

    def manual_capture(self) -> None:
        cfg = self._cfg
        if cfg is None or self.worker.busy:
            return
        self.bridge.update_status.emit("THINKING")
        try:
            audio = sd.rec(int(MANUAL_RECORD_SECS * cfg.sample_rate),
                           samplerate=cfg.sample_rate, channels=cfg.channels,
                           dtype="float32", device=cfg.device_id)
            sd.wait()
            self.worker.submit([audio], cfg, "MANUAL")
        except Exception as e:
            self.bridge.update_text.emit(f"[Capture Error] {e}")
            self.bridge.update_status.emit("LISTENING" if self.armed else "OFF")

    # ── Main VAD loop ─────────────────────────────────────────────────────────

    def run(self) -> None:
        cfg = resolve_audio()
        self._cfg = cfg
        self.bridge.update_src.emit(cfg.label)
        self.bridge.update_status.emit("CALIBRATING")
        self._threshold = calibrate_vad(cfg)
        self.bridge.update_status.emit("OFF")

        sr         = cfg.sample_rate
        state      = self._IDLE
        buf: list  = []
        silence_start = speech_start = 0.0
        chunk_count   = 0
        max_chunks    = int(VAD_MAX_SPEECH_SECS * sr / CHUNK_FRAMES)
        thr           = self._threshold

        def _cb(indata, frames, time_info, status):
            nonlocal state, buf, silence_start, speech_start, chunk_count
            mono  = indata.ravel()
            rms   = float(np.sqrt(np.mean(mono.astype(np.float64) ** 2)))
            now   = time.monotonic()
            chunk_count += 1
            chunk_copy  = indata.copy()

            if chunk_count % RMS_UPDATE_EVERY_N_CHUNKS == 0:
                self.bridge.update_rms.emit(rms)

            if not self.armed:
                state = self._IDLE; buf = []
                return

            if state == self._IDLE:
                if rms > thr and not self.worker.busy:
                    state = self._SPEAKING; speech_start = now
                    buf   = [chunk_copy]
                    self.bridge.update_status.emit("SPEAKING")
                    print("[VAD] Speech start.")

            elif state == self._SPEAKING:
                buf.append(chunk_copy)
                if len(buf) >= max_chunks:
                    self._fire(buf, cfg); state = self._IDLE; buf = []
                elif rms < thr:
                    state = self._TRAILING; silence_start = now
                    self._force_trigger.clear()

            elif state == self._TRAILING:
                buf.append(chunk_copy)
                if rms > thr:
                    state = self._SPEAKING
                else:
                    with self._lock:
                        last_txt = self._last_transcript
                    dyn_secs = get_dynamic_silence_threshold(last_txt)
                    forced   = self._force_trigger.is_set()
                    if forced or (now - silence_start) >= dyn_secs:
                        secs = now - speech_start
                        if secs >= VAD_MIN_SPEECH_SECS:
                            reason = "FORCED" if forced else f"{dyn_secs:.1f}s silence"
                            print(f"[VAD] Utterance end ({secs:.1f}s, {reason}). Fire.")
                            self._force_trigger.clear()
                            self._fire(buf, cfg, f"{secs:.1f}s")
                        else:
                            self.bridge.update_status.emit("LISTENING")
                        state = self._IDLE; buf = []

        try:
            with sd.InputStream(device=cfg.device_id, samplerate=sr,
                                 channels=cfg.channels, dtype="float32",
                                 blocksize=CHUNK_FRAMES, callback=_cb):
                print("[VAD] Stream open.")
                threading.Event().wait()
        except Exception as e:
            print(f"[VAD] Stream error: {e}")
            self.bridge.update_text.emit(f"[Audio Error] {e}")

    def _fire(self, frames: list, cfg: AudioConfig, label: str = "VAD") -> None:
        self.bridge.update_status.emit("THINKING")
        self.worker.submit(list(frames), cfg, label)


# ══════════════════════════════════════════════════════════════════════════════
# LoginDialog removed — no login required; overlay connects via anon key directly.



# ══════════════════════════════════════════════════════════════════════════════
# OVERLAY STYLES
# ══════════════════════════════════════════════════════════════════════════════

_PANEL_BG = """
QWidget#overlay {
    background-color: rgba(10, 14, 23, 235);
    border-radius: 12px;
    border: 1px solid rgba(31, 41, 61, 220);
}
"""
_BTN_START   = "QPushButton { background: qlineargradient(x1:0,y1:0,x2:1,y2:0, stop:0 rgba(25,185,90,230), stop:1 rgba(15,145,65,220)); color: white; border-radius: 11px; padding: 4px 16px; font-family: 'Segoe UI'; font-size: 11px; font-weight: bold; border: none; } QPushButton:hover { background: rgba(35,205,105,240); }"
_BTN_STOP    = "QPushButton { background: qlineargradient(x1:0,y1:0,x2:1,y2:0, stop:0 rgba(215,55,55,230), stop:1 rgba(170,25,25,220)); color: white; border-radius: 11px; padding: 4px 16px; font-family: 'Segoe UI'; font-size: 11px; font-weight: bold; border: none; } QPushButton:hover { background: rgba(235,70,70,240); }"
_BTN_CAPTURE = "QPushButton { background: rgba(255,195,45,25); color: rgba(255,215,90,210); border-radius: 9px; padding: 3px 11px; font-family: 'Segoe UI'; font-size: 11px; border: 1px solid rgba(255,195,45,55); } QPushButton:hover { background: rgba(255,195,45,55); }"
_BTN_HIDE    = "QPushButton { background: rgba(255,255,255,14); color: rgba(170,190,255,170); border-radius: 9px; padding: 3px 10px; font-family: 'Segoe UI'; font-size: 13px; border: 1px solid rgba(255,255,255,22); min-width: 26px; } QPushButton:hover { background: rgba(255,255,255,35); }"
_DOT_GREEN   = "QPushButton { background: rgba(30,195,95,230); border-radius: 12px; border: 2px solid rgba(255,255,255,90); } QPushButton:hover { background: rgba(50,215,115,245); }"
_DOT_RED     = "QPushButton { background: rgba(215,55,55,230); border-radius: 12px; border: 2px solid rgba(255,255,255,90); } QPushButton:hover { background: rgba(235,70,70,245); }"
_DOT_BLUE    = "QPushButton { background: rgba(70,140,255,230); border-radius: 12px; border: 2px solid rgba(255,255,255,90); } QPushButton:hover { background: rgba(90,160,255,245); }"


# ══════════════════════════════════════════════════════════════════════════════
# OVERLAY WINDOW
# ══════════════════════════════════════════════════════════════════════════════

class OverlayWindow(QWidget):

    def __init__(self, bridge: Bridge, vad: VADMonitor, worker: PipelineWorker) -> None:
        super().__init__()
        self.bridge      = bridge
        self.vad         = vad
        self.worker      = worker
        self._armed      = False
        self._collapsed  = False

        self._build_ui()
        self._apply_win32_styles()

        bridge.update_text.connect(self._on_result)
        bridge.update_stream.connect(self._on_stream)
        bridge.update_status.connect(self._on_status)
        bridge.update_src.connect(self._on_src)
        bridge.update_rms.connect(self._on_rms)
        bridge.profile_updated.connect(self._on_profile_updated)
        bridge.session_activated.connect(self._on_session_activated)

    # ── Build UI ──────────────────────────────────────────────────────────────

    def _build_ui(self) -> None:
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WA_ShowWithoutActivating, True)
        self.setWindowOpacity(1.0)
        self.setGeometry(WIN_X, WIN_Y, WIN_W, WIN_H)

        # Collapsed dot
        self.dot = QPushButton("", self)
        self.dot.setFixedSize(DOT_SIZE, DOT_SIZE)
        self.dot.setStyleSheet(_DOT_GREEN)
        self.dot.setCursor(QCursor(Qt.PointingHandCursor))
        self.dot.clicked.connect(self._expand)
        self.dot.hide()

        # Full panel
        self.panel = QWidget(self)
        self.panel.setObjectName("overlay")
        self.panel.setGeometry(0, 0, WIN_W, WIN_H)
        self.panel.setStyleSheet(_PANEL_BG)

        root = QVBoxLayout(self.panel)
        root.setContentsMargins(14, 10, 14, 10)
        root.setSpacing(6)

        # ── Profile strip (NEW) ────────────────────────────────────────────
        self.profile_lbl = QLabel("⏳ Waiting for web wizard...")
        self.profile_lbl.setFont(QFont("Segoe UI", 8))
        self.profile_lbl.setStyleSheet(
            "color: rgba(120,150,255,180); "
            "background: rgba(70,100,255,12); "
            "border: 1px solid rgba(70,100,255,30); "
            "border-radius: 6px; padding: 1px 8px;"
        )
        root.addWidget(self.profile_lbl)

        # ── Toolbar ────────────────────────────────────────────────────────
        bar = QHBoxLayout(); bar.setSpacing(7)

        self.btn_arm = QPushButton("🟢  START COPILOT")
        self.btn_arm.setStyleSheet(_BTN_START)
        self.btn_arm.setCursor(QCursor(Qt.PointingHandCursor))
        self.btn_arm.setFixedHeight(26)
        self.btn_arm.clicked.connect(self._toggle_arm)
        bar.addWidget(self.btn_arm)

        bar.addWidget(self._sep())

        mode_lbl = QLabel("⬤  General")
        mode_lbl.setFont(QFont("Segoe UI", 9, QFont.Bold))
        mode_lbl.setStyleSheet(
            "color: rgba(70,145,255,230); background: rgba(70,145,255,22); "
            "border: 1px solid rgba(70,145,255,55); border-radius: 9px; padding: 2px 10px;"
        )
        bar.addWidget(mode_lbl)

        bar.addStretch(1)

        self.status_lbl = QLabel("● OFF")
        self.status_lbl.setFont(QFont("Segoe UI", 9, QFont.Bold))
        self.status_lbl.setStyleSheet("color: rgba(150,150,180,200);")
        bar.addWidget(self.status_lbl)

        bar.addWidget(self._sep())

        self.btn_capture = QPushButton("⏺  Capture")
        self.btn_capture.setStyleSheet(_BTN_CAPTURE)
        self.btn_capture.setCursor(QCursor(Qt.PointingHandCursor))
        self.btn_capture.setFixedHeight(24)
        self.btn_capture.clicked.connect(
            lambda: threading.Thread(target=self.vad.manual_capture, daemon=True).start()
        )
        bar.addWidget(self.btn_capture)

        self.btn_hide = QPushButton("－")
        self.btn_hide.setStyleSheet(_BTN_HIDE)
        self.btn_hide.setCursor(QCursor(Qt.PointingHandCursor))
        self.btn_hide.setFixedSize(30, 24)
        self.btn_hide.clicked.connect(self._collapse)
        bar.addWidget(self.btn_hide)

        root.addLayout(bar)

        div = QFrame(); div.setFrameShape(QFrame.HLine)
        div.setStyleSheet("color: rgba(90,160,255,35);")
        root.addWidget(div)

        # Source + RMS row
        src_row = QHBoxLayout()
        self.src_lbl = QLabel("Detecting audio source...")
        self.src_lbl.setFont(QFont("Consolas", 7))
        self.src_lbl.setStyleSheet("color: rgba(130,140,175,115);")
        src_row.addWidget(self.src_lbl)
        src_row.addStretch(1)
        self.rms_lbl = QLabel("RMS: 0   [------------]")
        self.rms_lbl.setFont(QFont("Consolas", 7))
        self.rms_lbl.setStyleSheet("color: rgba(110,130,155,120);")
        src_row.addWidget(self.rms_lbl)
        root.addLayout(src_row)

        # Response area
        self.response = QLabel(
            "Press  🟢 START COPILOT  to begin listening.\n"
            "Or click  ⏺ Capture  to manually record 8 seconds."
        )
        self.response.setFont(QFont("Segoe UI", 11, QFont.Medium))
        self.response.setStyleSheet("color: rgba(210,225,255,200);")
        self.response.setWordWrap(True)
        self.response.setAlignment(Qt.AlignLeft | Qt.AlignTop)
        root.addWidget(self.response)

    @staticmethod
    def _sep() -> QLabel:
        s = QLabel("|")
        s.setStyleSheet("color: rgba(255,255,255,35); font-size:15px;")
        return s

    # ── Win32 stealth flags ───────────────────────────────────────────────────

    def _apply_win32_styles(self) -> None:
        try:
            user32 = ctypes.windll.user32
            hwnd   = int(self.winId())
            ex     = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            ex    |= WS_EX_LAYERED | WS_EX_NOACTIVATE
            user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex)
            user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
            print("[Win32] WDA_EXCLUDEFROMCAPTURE — STEALTH active.")
            geo = self.geometry()
            user32.SetWindowPos(
                hwnd, HWND_TOPMOST,
                geo.x(), geo.y(), geo.width(), geo.height(),
                SWP_NOACTIVATE | SWP_SHOWWINDOW,
            )
            print("[Win32] HWND_TOPMOST — above all windows.")
        except Exception as e:
            print(f"[Win32] Style error (non-fatal): {e}")

    def _enforce_topmost(self) -> None:
        try:
            user32 = ctypes.windll.user32
            hwnd   = int(self.winId())
            geo    = self.geometry()
            user32.SetWindowPos(
                hwnd, HWND_TOPMOST,
                geo.x(), geo.y(), geo.width(), geo.height(),
                SWP_NOACTIVATE | SWP_SHOWWINDOW,
            )
        except Exception:
            pass

    # ── Handlers ──────────────────────────────────────────────────────────────

    def _toggle_arm(self) -> None:
        if not self._armed:
            self._armed = True
            self.btn_arm.setText("🔴  STOP COPILOT")
            self.btn_arm.setStyleSheet(_BTN_STOP)
            self.vad.arm()
        else:
            self._armed = False
            self.btn_arm.setText("🟢  START COPILOT")
            self.btn_arm.setStyleSheet(_BTN_START)
            self.vad.disarm()

    def _collapse(self) -> None:
        self._collapsed = True
        dot_x = self.x() + WIN_W - DOT_SIZE - 6
        dot_y = self.y() + 6
        self.panel.hide()
        self.dot.move(0, 0)
        self.dot.show()
        self._update_dot_color()
        self.resize(DOT_SIZE, DOT_SIZE)
        self.move(dot_x, dot_y)

    def _expand(self) -> None:
        self._collapsed = False
        self.dot.hide()
        self.panel.show()
        screen = QApplication.primaryScreen().availableGeometry()
        x = max(0, min(self.x() - WIN_W + DOT_SIZE + 6, screen.width()  - WIN_W))
        y = max(0, min(self.y() - 6,                     screen.height() - WIN_H))
        self.setGeometry(x, y, WIN_W, WIN_H)
        self.panel.setGeometry(0, 0, WIN_W, WIN_H)
        self._apply_win32_styles()

    def _update_dot_color(self) -> None:
        t = self.status_lbl.text()
        if "THINKING" in t:
            self.dot.setStyleSheet(_DOT_BLUE)
        elif "LISTENING" in t or "SPEAKING" in t:
            self.dot.setStyleSheet(_DOT_RED)
        else:
            self.dot.setStyleSheet(_DOT_GREEN)

    def adjust_overlay_height(self) -> None:
        if self._collapsed:
            return
        MIN_H, MAX_H = 160, 520
        text_h   = self.response.heightForWidth(WIN_W - 28)
        if text_h < 1:
            text_h = self.response.sizeHint().height()
        chrome_h = 108   # profile strip + toolbar + divider + src row + padding
        target_h = max(MIN_H, min(text_h + chrome_h, MAX_H))
        if self.height() != target_h:
            self.resize(WIN_W, target_h)
            self.panel.resize(WIN_W, target_h)
            self._enforce_topmost()

    # ── Slots ─────────────────────────────────────────────────────────────────

    def _on_result(self, text: str) -> None:
        self.response.setText(text)
        if not text:
            return
        color = "rgba(255,110,110,230)" if text.startswith("[") else "rgba(210,228,255,215)"
        self.response.setStyleSheet(f"color: {color};")
        self.adjust_overlay_height()

    def _on_stream(self, token: str) -> None:
        self.response.setText(self.response.text() + token)
        self.response.setStyleSheet("color: rgba(210,228,255,215);")
        self.adjust_overlay_height()

    def _on_status(self, state: str) -> None:
        label, color = STATUS_META.get(state, ("● ?", "white"))
        self.status_lbl.setText(label)
        self.status_lbl.setStyleSheet(f"color: {color};")
        if self._collapsed:
            self._update_dot_color()

    def _on_src(self, label: str) -> None:
        self.src_lbl.setText(label)

    def _on_rms(self, rms: float) -> None:
        rms_int = int(rms * 32767)
        width   = 12
        filled  = int(min(rms / (VAD_CALIBRATION_MIN * 4), 1.0) * width)
        bar     = "[" + "#" * filled + "-" * (width - filled) + "]"
        self.rms_lbl.setText(f"RMS: {rms_int:>5d}  {bar}")

    def _on_profile_updated(self, role_title: str) -> None:
        """Called when Supabase Realtime fires — updates the profile strip."""
        if role_title:
            self.profile_lbl.setText(f"⚡  Active Profile: {role_title}")
            self.profile_lbl.setStyleSheet(
                "color: rgba(80,200,120,210); "
                "background: rgba(40,180,90,12); "
                "border: 1px solid rgba(40,180,90,35); "
                "border-radius: 6px; padding: 1px 8px;"
            )
            # Notify overlay to expand — web wizard just activated a session
            self.bridge.session_activated.emit()
        else:
            self.profile_lbl.setText("⚠  No profile active — set one in the web panel")
            self.profile_lbl.setStyleSheet(
                "color: rgba(255,180,60,200); "
                "background: rgba(255,160,30,10); "
                "border: 1px solid rgba(255,160,30,30); "
                "border-radius: 6px; padding: 1px 8px;"
            )

    def _on_session_activated(self) -> None:
        """
        Fired when the web wizard pushes a new session to Supabase.
        Auto-expands the overlay and starts the copilot listening —
        so clicking 'Start Copilot Session' in the browser IS the trigger.
        """
        # Expand if collapsed
        if self._collapsed:
            self._expand()

        # Make sure window is visible and on top
        self.show()
        self.raise_()
        self._enforce_topmost()

        # Auto-arm the VAD so it starts listening immediately
        if not self._armed:
            self._toggle_arm()

        print("[Overlay] Session activated from web wizard — overlay expanded + listening.")

    # ── Drag ─────────────────────────────────────────────────────────────────

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.LeftButton:
            self._drag_pos = event.globalPos() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, event) -> None:
        if event.buttons() == Qt.LeftButton and hasattr(self, "_drag_pos"):
            self.move(event.globalPos() - self._drag_pos)


# ══════════════════════════════════════════════════════════════════════════════
# GLOBAL HOTKEY LISTENER (Win32 RegisterHotKey — no focus steal)
# ══════════════════════════════════════════════════════════════════════════════

def _run_hotkey_listener(vad: VADMonitor, bridge: Bridge) -> None:
    user32      = ctypes.windll.user32
    MOD_CONTROL = 0x0002
    VK_RETURN   = 0x0D
    VK_ESCAPE   = 0x1B

    ok1 = user32.RegisterHotKey(None, 1, MOD_CONTROL, VK_RETURN)
    ok2 = user32.RegisterHotKey(None, 2, 0,           VK_ESCAPE)
    print(f"[Hotkey] Ctrl+Enter registered={bool(ok1)}  Escape registered={bool(ok2)}")

    msg = ctypes.wintypes.MSG()
    while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
        if msg.message == 0x0312:   # WM_HOTKEY
            if msg.wParam == 1:
                print("[Hotkey] Ctrl+Enter → force trigger")
                vad.force_trigger_now()
            elif msg.wParam == 2:
                print("[Hotkey] Escape → cancel stream")
                bridge.cancel_stream.emit()
        user32.TranslateMessage(ctypes.byref(msg))
        user32.DispatchMessageW(ctypes.byref(msg))

    user32.UnregisterHotKey(None, 1)
    user32.UnregisterHotKey(None, 2)


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    global _CHAT_MODEL
    os.environ.setdefault("GROQ_API_KEY", GROQ_API_KEY)

    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(True)

    # ── Step 1: Connect to Supabase (no login required) ──────────────────────
    print("[Copilot] Connecting to Supabase (anon key — no login required) ...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[Copilot] Connected.")

    # ── Step 2: Resolve Groq model ────────────────────────────────────────────
    print("[Copilot] Resolving Groq chat model ...")
    _CHAT_MODEL = resolve_model()

    # ── Step 3: Core engine ───────────────────────────────────────────────────
    bridge = Bridge()
    worker = PipelineWorker(bridge)
    worker.start()

    vad = VADMonitor(worker, bridge)
    worker.set_vad(vad)
    vad.start()

    # ── Step 4: Supabase Realtime sync (load profile + subscribe) ────────────
    sync = RealtimeSyncThread(supabase, bridge)
    sync.start()

    # ── Step 5: Win32 hotkeys ─────────────────────────────────────────────────
    hk_thread = threading.Thread(
        target=_run_hotkey_listener, args=(vad, bridge), daemon=True
    )
    hk_thread.start()

    # ── Step 6: Overlay window ────────────────────────────────────────────────
    window = OverlayWindow(bridge, vad, worker)
    window.show()
    window._apply_win32_styles()   # apply stealth flags before collapsing
    window._collapse()             # start as a tiny green dot — web wizard is the trigger
    print("[Copilot] Overlay hidden as dot — trigger it from the web wizard.")

    print("=" * 60)
    print(f"[Copilot] Overlay at ({WIN_X},{WIN_Y})  {WIN_W}x{WIN_H}")
    print("[Copilot] Hotkeys: Ctrl+Enter=Force Trigger | Escape=Cancel")
    print("[Copilot] VAD:     Dynamic endpointing (1.5s / profile / 3.5s)")
    print("[Copilot] Realtime: Subscribed to active_sessions changes")
    print("[Copilot] WDA_EXCLUDEFROMCAPTURE  — invisible to screen share")
    print("[Copilot] WS_EX_NOACTIVATE        — never steals keyboard focus")
    print("=" * 60)

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
