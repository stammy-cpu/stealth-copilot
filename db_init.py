"""
Stealth Copilot - Supabase DB Initialisation
Executes schema, RLS policies, realtime setup, and verification.
Uses the Supabase Management API (no CLI required).
"""

import json, sys, urllib.request, urllib.error

# ---- Credentials -------------------------------------------------------------
PROJECT_REF  = "fsmavohjwxhyihpqnofn"
PAT          = os.environ.get("SUPABASE_PAT", "")  # Set via environment variable
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWF2b2hqd3hoeWlocHFub2ZuIiwicm9sZSI"
    "6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg3NzEyNywiZXhwIjoyMTA2NDUzMTI3fQ"
    ".oaxwG8X2t9nEg3xKfsOpVhjuiiLk-HCSV6G81MONSSI"
)
ANON_KEY     = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWF2b2hqd3hoeWlocHFub2ZuIiwicm9sZSI"
    "6ImFub24iLCJpYXQiOjE3OTA4NzcxMjcsImV4cCI6MjEwNjQ1MzEyN30"
    ".RKCCDJSHSa6ZB0g7ujCjmfeZ5DcfDjHriAYRORDRpNY"
)
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"
MGMT_URL     = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

# ---- SQL runner --------------------------------------------------------------
def run_sql(label: str, sql: str) -> dict:
    body = json.dumps({"query": sql}).encode("utf-8")
    req  = urllib.request.Request(
        MGMT_URL,
        data    = body,
        headers = {
            "Authorization": f"Bearer {PAT}",
            "Content-Type":  "application/json",
        },
        method  = "POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            print(f"  [OK]    {label}")
            return data
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"  [FAIL]  {label}")
        print(f"          {err}")
        sys.exit(1)


# ---- REST helper (for verification) -----------------------------------------
def rest(method: str, path: str, body=None, token: str = SERVICE_KEY) -> list:
    url  = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    req  = urllib.request.Request(
        url,
        data    = data,
        headers = {
            "apikey":        token,
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
            "Prefer":        "return=representation",
        },
        method = method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read() or "[]")
    except urllib.error.HTTPError as e:
        return {"__error__": e.read().decode("utf-8", errors="replace"),
                "__status__": e.code}


# ==============================================================================
print("\n[1/5]  interview_profiles table")
run_sql("CREATE TABLE interview_profiles", """
CREATE TABLE IF NOT EXISTS public.interview_profiles (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_title            TEXT        NOT NULL,
  company_name          TEXT,
  hourly_rate           TEXT,
  cv_raw_text           TEXT,
  jd_raw_text           TEXT,
  system_prompt         TEXT,
  vad_silence_threshold NUMERIC     NOT NULL DEFAULT 2.7,
  max_tokens            INTEGER     NOT NULL DEFAULT 380,
  temperature           NUMERIC     NOT NULL DEFAULT 0.45,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
""")

# ==============================================================================
print("\n[2/5]  active_sessions table")
run_sql("CREATE TABLE active_sessions", """
CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_profile_id     UUID        REFERENCES public.interview_profiles(id) ON DELETE SET NULL,
  is_desktop_connected  BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
""")

# ==============================================================================
print("\n[3/5]  Realtime publication")
run_sql("ADD TABLE active_sessions TO supabase_realtime", """
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
""")

# ==============================================================================
print("\n[4/5]  RLS - interview_profiles")
run_sql("ENABLE ROW LEVEL SECURITY interview_profiles", """
ALTER TABLE public.interview_profiles ENABLE ROW LEVEL SECURITY;
""")
for name, verb, clause in [
    ("profiles_select_own", "FOR SELECT", "USING (auth.uid() = user_id)"),
    ("profiles_insert_own", "FOR INSERT", "WITH CHECK (auth.uid() = user_id)"),
    ("profiles_update_own", "FOR UPDATE",
     "USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)"),
    ("profiles_delete_own", "FOR DELETE", "USING (auth.uid() = user_id)"),
]:
    run_sql(f"POLICY {name}", f"""
DROP POLICY IF EXISTS "{name}" ON public.interview_profiles;
CREATE POLICY "{name}" ON public.interview_profiles {verb} {clause};
""")

# ==============================================================================
print("\n[5/5]  RLS - active_sessions")
run_sql("ENABLE ROW LEVEL SECURITY active_sessions", """
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
""")
for name, verb, clause in [
    ("sessions_select_own", "FOR SELECT", "USING (auth.uid() = user_id)"),
    ("sessions_insert_own", "FOR INSERT", "WITH CHECK (auth.uid() = user_id)"),
    ("sessions_update_own", "FOR UPDATE",
     "USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)"),
    ("sessions_delete_own", "FOR DELETE", "USING (auth.uid() = user_id)"),
]:
    run_sql(f"POLICY {name}", f"""
DROP POLICY IF EXISTS "{name}" ON public.active_sessions;
CREATE POLICY "{name}" ON public.active_sessions {verb} {clause};
""")

# ==============================================================================
print("\n" + "-" * 56)
print("VERIFICATION: service-role read/write check ...")

profiles     = rest("GET", "interview_profiles?limit=5")
sessions     = rest("GET", "active_sessions?limit=5")
anon_check   = rest("GET", "interview_profiles?limit=1", token=ANON_KEY)

profiles_ok  = isinstance(profiles, list)
sessions_ok  = isinstance(sessions, list)
rls_ok       = isinstance(anon_check, list) and len(anon_check) == 0

print(f"  [{'OK' if profiles_ok else 'FAIL'}]  interview_profiles  ({len(profiles) if profiles_ok else profiles} rows)")
print(f"  [{'OK' if sessions_ok else 'FAIL'}]  active_sessions     ({len(sessions) if sessions_ok else sessions} rows)")
print(f"  [{'OK' if rls_ok else 'WARN'}]  RLS anon block      ({'0 rows returned - PASS' if rls_ok else str(anon_check)})")

print("\n" + "=" * 56)
status = "DATABASE FULLY INITIALISED - All checks passed." if (profiles_ok and sessions_ok and rls_ok) \
         else "Initialisation complete with warnings (see above)."
print(f"  {status}")
print(f"\n  Project  : {SUPABASE_URL}")
print(f"  Anon Key : {ANON_KEY[:50]}...")
print(f"  Svc Key  : {SERVICE_KEY[:50]}...")
print("=" * 56)
