import sounddevice as sd
import numpy as np

print("Testing WASAPI loopback on device 8 (Speaker)...")
try:
    wasapi_settings = sd.WasapiSettings(exclusive=False)
    audio = sd.rec(int(3*48000), samplerate=48000, channels=2, dtype="float32",
                   device=8, extra_settings=wasapi_settings)
    sd.wait()
    rms = float(np.sqrt(np.mean(audio.astype(np.float64)**2)))
    print(f"WASAPI loopback RMS float32 = {rms:.6f}")
    print(f"WASAPI loopback RMS int16-equiv = {rms*32767:.1f}")
    print("ACTIVE" if rms > 0.001 else "SILENT (no audio playing?)")
except Exception as e:
    print(f"ERROR on device 8: {e}")

print()
print("Scanning all WASAPI output devices as loopback sources...")
devices  = sd.query_devices()
hostapis = sd.query_hostapis()
wasapi_idx = next(i for i, h in enumerate(hostapis) if "WASAPI" in h["name"])
for i, d in enumerate(devices):
    if d["hostapi"] == wasapi_idx and d["max_output_channels"] > 0:
        try:
            sr  = int(d["default_samplerate"])
            ch  = min(d["max_output_channels"], 2)
            ws  = sd.WasapiSettings(exclusive=False)
            audio = sd.rec(int(2*sr), samplerate=sr, channels=ch,
                           dtype="float32", device=i, extra_settings=ws)
            sd.wait()
            rms = float(np.sqrt(np.mean(audio.astype(np.float64)**2)))
            tag = "<<< ACTIVE" if rms > 0.001 else "silent"
            print(f"  [{i:>2}] SR={sr}  RMS={rms*32767:8.1f}  {tag:<12}  {d['name']}")
        except Exception as e:
            print(f"  [{i:>2}] ERROR: {e} | {d['name']}")
