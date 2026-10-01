"""
test_audio.py — WASAPI loopback diagnostic.
Lists all audio devices, tests each WASAPI input for live RMS signal,
and prints the recommended device index for stealth_copilot.py.

Run this while system audio is playing (music / video / TTS).
"""

import sys
import numpy as np
import sounddevice as sd

RECORD_SECS = 3
DTYPE       = "int16"


def rms(data: np.ndarray) -> float:
    return float(np.sqrt(np.mean(data.astype(np.float64) ** 2)))


def bar(level: float, peak: float = 3000, width: int = 30) -> str:
    filled = int(min(level / peak, 1.0) * width)
    return "[" + "█" * filled + "░" * (width - filled) + f"] {level:7.1f}"


# ── 1. Full device table ───────────────────────────────────────────────────────

print("\n" + "=" * 80)
print("  AUDIO DEVICE TABLE")
print("=" * 80)

devices   = sd.query_devices()
hostapis  = sd.query_hostapis()

print(f"{'IDX':>4}  {'HOSTAPI':<15}  {'IN':>3}  {'OUT':>3}  {'SR':>7}  NAME")
print("-" * 80)
for i, d in enumerate(devices):
    ha   = hostapis[d["hostapi"]]["name"]
    note = " ◄ DEFAULT INPUT"  if i == sd.default.device[0] else ""
    note = " ◄ DEFAULT OUTPUT" if i == sd.default.device[1] else note
    print(f"{i:>4}  {ha:<15}  {d['max_input_channels']:>3}  "
          f"{d['max_output_channels']:>3}  {int(d['default_samplerate']):>7}  "
          f"{d['name']}{note}")

# ── 2. Identify WASAPI host API index ─────────────────────────────────────────

wasapi_idx = next(
    (i for i, h in enumerate(hostapis) if "WASAPI" in h["name"]), None
)
print(f"\nWASAPI host API index : {wasapi_idx}")

if wasapi_idx is None:
    print("ERROR: No WASAPI host API found. Is this Windows?")
    sys.exit(1)

# ── 3. Collect WASAPI input devices ───────────────────────────────────────────

candidates = [
    (i, d["name"], int(d["default_samplerate"]))
    for i, d in enumerate(devices)
    if d["hostapi"] == wasapi_idx and d["max_input_channels"] > 0
]

print(f"\nWASAPI input devices  : {len(candidates)}")
for cid, cname, csr in candidates:
    is_lb = any(k in cname.lower() for k in ("loopback", "stereo mix", "wave out", "what u hear"))
    tag   = " [LOOPBACK CANDIDATE]" if is_lb else ""
    print(f"  [{cid:>3}]  {csr:>6} Hz  {cname}{tag}")

# ── 4. Record from each and measure RMS ───────────────────────────────────────

print(f"\n{'=' * 80}")
print(f"  RECORDING TEST  ({RECORD_SECS}s per device)  — play audio now if testing loopback!")
print(f"{'=' * 80}")

results = []
for dev_id, dev_name, dev_sr in candidates:
    try:
        print(f"\n  [{dev_id:>3}] {dev_name[:55]:<55}", end="  ", flush=True)
        audio = sd.rec(
            int(RECORD_SECS * dev_sr),
            samplerate=dev_sr,
            channels=1,
            dtype=DTYPE,
            device=dev_id,
        )
        sd.wait()
        level = rms(audio)
        print(bar(level))
        results.append((dev_id, dev_name, dev_sr, level))
    except Exception as e:
        print(f"SKIP  ({e})")

# ── 5. Summary & recommendation ───────────────────────────────────────────────

print(f"\n{'=' * 80}")
print("  RESULTS")
print(f"{'=' * 80}")

active = [(d, n, s, r) for d, n, s, r in results if r > 30]
active.sort(key=lambda x: -x[3])

if active:
    best_id, best_name, best_sr, best_rms = active[0]
    print(f"\n  ✓  BEST DEVICE  [{best_id}]  {best_name}")
    print(f"     Sample rate : {best_sr} Hz")
    print(f"     RMS level   : {best_rms:.1f}")
    print(f"\n  Set in stealth_copilot.py:")
    print(f"     PREFERRED_DEVICE = {best_id}")
    print(f"\n  All active devices:")
    for d, n, s, r in active:
        print(f"     [{d:>3}]  RMS={r:7.1f}  {n}")
else:
    print("\n  ✗  No device returned non-zero RMS.")
    print("     Try playing audio (music / YouTube) and re-run this script.")
    print("     Also try enabling 'Stereo Mix' in Windows Sound settings.")
    print("\n  All recorded RMS values:")
    for d, n, s, r in results:
        print(f"     [{d:>3}]  RMS={r:7.1f}  {n}")

print()
