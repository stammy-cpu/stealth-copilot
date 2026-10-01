"""
build_installer.py
==================
PyInstaller packaging script for Stealth Copilot v2.

Usage:
    python build_installer.py

Output:
    dist/StealthCopilot/StealthCopilot.exe   (one-folder bundle)
    dist/StealthCopilot.exe                  (single-file exe, slower startup)

After this script finishes, run Inno Setup on installer_config.iss to
produce the final StealthCopilot_Setup.exe installer.

Requirements:
    pip install pyinstaller supabase groq sounddevice numpy PyQt5 websockets
"""

import subprocess
import sys
import os

# ─── Paths ────────────────────────────────────────────────────────────────────

ROOT        = os.path.dirname(os.path.abspath(__file__))
ENTRY_POINT = os.path.join(ROOT, "stealth_copilot.py")
DIST_DIR    = os.path.join(ROOT, "dist")
BUILD_DIR   = os.path.join(ROOT, "build")
SPEC_DIR    = ROOT

# ─── Hidden imports ──────────────────────────────────────────────────────────
# PyInstaller misses these with static analysis — list every sub-module that
# is imported dynamically or via __import__() at runtime.

HIDDEN_IMPORTS = [
    # PyQt5
    "PyQt5",
    "PyQt5.QtCore",
    "PyQt5.QtWidgets",
    "PyQt5.QtGui",
    "PyQt5.sip",
    # Supabase stack
    "supabase",
    "supabase._async",
    "supabase._sync",
    "supabase_auth",
    "postgrest",
    "storage3",
    "realtime",
    "realtime._async",
    "realtime._async.client",
    "realtime._async.channel",
    "realtime.types",
    "httpx",
    "httpx._transports",
    "httpcore",
    # Groq
    "groq",
    "groq._client",
    "groq.resources",
    "groq.resources.audio",
    "groq.resources.chat",
    # Audio
    "sounddevice",
    "soundfile",
    "numpy",
    "numpy.core",
    "numpy.lib",
    "cffi",
    "_cffi_backend",
    # Async / networking
    "asyncio",
    "websockets",
    "websockets.legacy",
    "websockets.legacy.client",
    "yarl",
    "aiohttp",
    "multidict",
    # Crypto (used by supabase-auth JWT)
    "cryptography",
    "cryptography.hazmat",
    "cryptography.hazmat.backends",
    "cryptography.hazmat.primitives",
    "jwt",
    "pyjwt",
    # Stdlib that sometimes gets missed
    "wave",
    "tempfile",
    "ctypes",
    "ctypes.wintypes",
    "threading",
    "json",
    "base64",
    "email",
    "urllib",
    "urllib.parse",
    "urllib.request",
    "http",
    "http.cookiejar",
]

# ─── Collected data (non-Python files that must be bundled) ──────────────────

COLLECT_DATA = [
    # PyQt5 Qt platform plugins (required for the GUI to open on Windows)
    ("PyQt5/Qt5/plugins/platforms", "PyQt5/Qt5/plugins/platforms"),
    ("PyQt5/Qt5/plugins/styles",    "PyQt5/Qt5/plugins/styles"),
]

# ─── PyInstaller command ─────────────────────────────────────────────────────

def build(onefile: bool = False) -> int:
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--name", "StealthCopilot",
        "--distpath", DIST_DIR,
        "--workpath", BUILD_DIR,
        "--specpath", SPEC_DIR,
        # No console window — the app uses a Qt GUI overlay only
        "--noconsole",
        # Icon (optional — comment out if icon.ico is not present)
        # "--icon", os.path.join(ROOT, "icon.ico"),
    ]

    if onefile:
        cmd.append("--onefile")
    else:
        cmd.append("--onedir")

    # Hidden imports
    for h in HIDDEN_IMPORTS:
        cmd += ["--hidden-import", h]

    # Data files
    for src, dst in COLLECT_DATA:
        cmd += ["--add-data", f"{src};{dst}"]

    cmd.append(ENTRY_POINT)

    print("=" * 60)
    print("Running PyInstaller...")
    print(" ".join(cmd))
    print("=" * 60)

    result = subprocess.run(cmd, cwd=ROOT)
    return result.returncode


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Build Stealth Copilot installer")
    parser.add_argument(
        "--onefile", action="store_true",
        help="Produce a single .exe (slower startup) instead of a folder bundle"
    )
    args = parser.parse_args()

    code = build(onefile=args.onefile)

    if code == 0:
        print()
        print("=" * 60)
        print("BUILD SUCCESSFUL")
        if args.onefile:
            print(f"  Executable : {os.path.join(DIST_DIR, 'StealthCopilot.exe')}")
        else:
            print(f"  Folder     : {os.path.join(DIST_DIR, 'StealthCopilot', '')}")
            print(f"  Executable : {os.path.join(DIST_DIR, 'StealthCopilot', 'StealthCopilot.exe')}")
        print()
        print("Next step: run Inno Setup on installer_config.iss")
        print("  iscc.exe installer_config.iss")
        print("=" * 60)
    else:
        print("BUILD FAILED — see output above.")
        sys.exit(code)
