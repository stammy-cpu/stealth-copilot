"""
test_loopback2.py - Try every channel count (1-8) and both exclusive/shared
on every WASAPI output device until one opens successfully.
"""
import sounddevice as sd
import numpy as np

devices  = sd.query_devices()
hostapis = sd.query_hostapis()
wasapi_idx = next(i for i, h in enumerate(hostapis) if "WASAPI" in h["name"])

print(f"WASAPI host API = {wasapi_idx}")
print(f"sounddevice version: {sd.__version__}\n")

# Also print raw info for device 8
d8 = sd.query_devices(8)
print("Device 8 raw info:")
for k, v in d8.items():
    print(f"  {k}: {v}")
print()

working = []
for i, d in enumerate(devices):
    if d["hostapi"] != wasapi_idx or d["max_output_channels"] == 0:
        continue
    sr = int(d["default_samplerate"])
    print(f"[{i}] {d['name']}  sr={sr}  maxout={d['max_output_channels']}")
    for exclusive in (False, True):
        for ch in (1, 2, d["max_output_channels"]):
            try:
                ws = sd.WasapiSettings(exclusive=exclusive)
                audio = sd.rec(int(2*sr), samplerate=sr, channels=ch,
                               dtype="float32", device=i, extra_settings=ws)
                sd.wait()
                rms = float(np.sqrt(np.mean(audio.astype(np.float64)**2)))
                tag = "ACTIVE" if rms > 0.001 else "silent"
                print(f"  OK  excl={exclusive} ch={ch}  RMS={rms*32767:.1f}  {tag}")
                working.append((i, d["name"], ch, exclusive, sr, rms*32767))
                break   # found a working config for this device
            except Exception as e:
                print(f"  ERR excl={exclusive} ch={ch}  {e}")
    print()

print("=== WORKING CONFIGS ===")
if working:
    for cfg in sorted(working, key=lambda x: -x[5]):
        dev_id, name, ch, excl, sr, rms_val = cfg
        print(f"  [{dev_id}] ch={ch} excl={excl} sr={sr} RMS={rms_val:.1f}  {name}")
else:
    print("  None found. Try enabling Stereo Mix in Windows Sound settings.")
