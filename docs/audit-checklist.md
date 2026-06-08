# Cortex MCP — Audit & Smoke Test Reference

## Golden Rule
**No test files. No mocks. No stubs. No dummy data.**
Every audit and every test runs against the real live server through the real MCP connection.

---

## Phase 1 — File Audit Format

Walk the project tree against the required layout in SKILL.md Section 2.
Print this for every file:

```
[✓] src/db/schema.js         — exists, all 13 CREATE TABLE statements present
[✗] src/tools/reminders.js   — FILE MISSING
[~] src/tools/snapshots.js   — exists but returns placeholder, not implemented
```

✓ = complete | ✗ = missing | ~ = partial/stub/broken

Do not proceed past the audit until every file is printed.

---

## Phase 2 — MCP Tool Live Call Report Format

Call every tool through the live MCP connection with real inputs. Print:

```
[✓] cortex_health         — { tables: 13, open_issues: 0, status: 'healthy' }
[✗] cortex_get_state      — ERROR: Cannot read property 'name' of undefined
[~] cortex_check_reminders — returns [] even when open issues exist
```

---

## 18 Live Verification Checks

Run these in order. Real calls, real DB, no scripts created.

**Check 1 — DB created**
Call `cortex_init`. Then: confirm `.cortex/cortex.db` exists.

**Check 2 — All 13 tables**
```
node -e "const db=require('better-sqlite3')('.cortex/cortex.db'); console.log(db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name').all())"
```
Must return all 13 table names.

**Check 3 — All tools register and respond**
Call every tool from docs/tools.md through your agent. None may return an error on valid input.

**Check 4 — cortex_get_state under 200 tokens**
Call `cortex_get_state`. Count words in response (split by spaces). Must be under 200.

**Check 5 — Missing test warning fires**
Call `cortex_tick_file` with `file_path: 'src/test-check.py'`. Do NOT call `cortex_add_test`.
Call `cortex_check_reminders`. Response must include "test is missing" warning for that file.

**Check 6 — Open issue warning fires**
Call `cortex_log_issue` with `title: 'test-issue'`. Call `cortex_check_reminders`.
Response must include open-issue block warning.

**Check 7 — Priority ordering**
Insert 3 todos with priority 10, 1, 5. Call `cortex_get_next_task`.
Must return the priority-1 task.

**Check 8 — ALL TASKS COMPLETE string**
Mark all todos as done. Call `cortex_get_next_task`.
Response must be exactly the string `ALL TASKS COMPLETE`.

**Check 9 — Rollback restores file**
1. Write a file with known content and call `cortex_tick_file` on it (saves checkpoint)
2. Corrupt the file content on disk
3. Get checkpoint id from DB
4. Call `cortex_rollback` with file and checkpoint id
5. Read file — must show original content

**Check 10 — SKIPPED** (`cortex_confirm_destructive` is V2 only)

**Check 11 — Dashboard responds**
`curl -s -o /dev/null -w '%{http_code}' http://localhost:4759` → must return `200`

**Check 12 — REST API /api/state responds**
`curl -s http://localhost:3001/api/state` → must return valid JSON from real DB

**Check 13 — All 9 REST endpoints present**
```
curl -s http://localhost:3001/api/features
curl -s http://localhost:3001/api/files
curl -s http://localhost:3001/api/tests
curl -s http://localhost:3001/api/issues
curl -s http://localhost:3001/api/progress
curl -s http://localhost:3001/api/snippets
curl -s http://localhost:3001/api/research
curl -s http://localhost:3001/api/dictionary
curl -s http://localhost:3001/api/settings
```
All must return valid JSON (not 404, not 500).

**Check 14 — Dictionary write and read**
Call `cortex_write_dictionary` with `key='check14'`, `short_summary='test summary'`, `full_description='full detail here'`.
Call `cortex_get_detail` with `key='check14'`. Must return `full_description='full detail here'`.

**Check 15 — Concurrent writes (WAL test)**
Run two simultaneous `better-sqlite3` inserts into `progress_log`.
Both must succeed. No `SQLITE_BUSY` error.

**Check 16 — .cortexignore blocks files**
Write `secret.env` to `.cortex/.cortexignore`.
Call `cortex_tick_file` with `file_path: 'secret.env'` → must return `{ error: "Path blocked by .cortexignore: secret.env" }`.
Query `file_tree` — `secret.env` must NOT be in the table.

**Check 17 — Snapshot saves to DB and disk**
Call `cortex_save_snapshot` with `summary='Test snapshot from check 17'`.
Query `snapshots` table — must have the row.
Check `.cortex/snapshots/` directory — must have the file.

**Check 18 — cortex_get_state includes snapshot**
Call `cortex_get_state`. Response must include the snapshot summary from Check 17.

---

## 8-Step Smoke Test (run after all 18 checks pass)

### Step 1 — Full stack startup
Run `cortex start`. Wait 5 seconds. Check:
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:4759` → `200`
- `curl -s http://localhost:3001/api/state` → valid JSON with real project data

### Step 2 — 22-call agent loop
Call these tools in order through live MCP:
1. `cortex_get_state`
2. `cortex_get_next_task`
3. `cortex_add_feature` — name: `'user-auth'`, priority: `'high'`
4. `cortex_get_next_task` — verify new task appears
5. `cortex_tick_file` — `'src/auth.py'`
6. `cortex_write_dictionary` — key: `'src/auth.py'`, short and full descriptions
7. `cortex_log_progress` — task: `'Created auth.py'`
8. `cortex_check_reminders` — must warn about missing test
9. `cortex_add_test` — name: `'test_auth_login'`
10. `cortex_update_test` — mark passed
11. `cortex_check_reminders` — missing-test warning must be GONE
12. `cortex_log_issue` — `'JWT secret hardcoded'`
13. `cortex_check_reminders` — open-issue warning must appear
14. `cortex_resolve_issue` — with fix description
15. `cortex_check_reminders` — open-issue warning must be GONE
16. `cortex_add_research` — library: `'jsonwebtoken'`
17. `cortex_add_decision` — `'Use JWT over sessions'`
18. `cortex_add_snippet` — JWT sign helper code
19. `cortex_update_feature` — mark `'user-auth'` as done
20. `cortex_get_next_task`
21. `cortex_save_snapshot`
22. `cortex_get_state` — confirm snapshot in output

After all 22 calls: query every table — each must have at least 1 real row.

### Step 3 — REST API serves real data
Hit all 9 GET endpoints. Each must return real rows from Step 2, not empty arrays.

### Step 4 — Context recovery
Call `cortex_get_state` cold (no prior context). Must return:
project name, last snapshot summary, last 3 progress entries, open issues, next task.
Call `cortex_get_next_task` immediately after — agent must be able to resume without human help.

### Step 5 — .cortexignore glob patterns
Add `src/secret.env` and `**/*.key` to `.cortexignore`.
- `cortex_tick_file('src/secret.env')` → error
- `cortex_tick_file('certs/server.key')` → error
- `cortex_tick_file('src/auth.js')` → success
Verify via DB: only `src/auth.js` appears in `file_tree`.

### Step 6 — Rollback live
Create file → tick it (saves checkpoint) → corrupt it → rollback → verify original content restored.

### Step 7 — Error log clean
`.cortex/error.log` must not exist or must be empty.

### Step 8 — Production checklist
```
node -e "const db=require('better-sqlite3')('.cortex/cortex.db'); console.log('WAL:', db.pragma('journal_mode'))"
```
→ `wal`

```
node -e "const db=require('better-sqlite3')('.cortex/cortex.db'); console.log(db.prepare('SELECT count(*) as n FROM sqlite_master WHERE type=\'table\'').get())"
```
→ `{ n: 13 }`

Search `src/` and `bin/` for `TODO|placeholder|stub|not implemented` → zero matches (except V2 comment in `human.js`)

---

## Final Report Format

```
================================================
CORTEX MCP — PRODUCTION SMOKE TEST REPORT
================================================
Step 1 — Full stack startup:        PASS / FAIL
Step 2 — 22-call agent loop:        PASS / FAIL
Step 3 — REST API real data:        PASS / FAIL
Step 4 — Context recovery:          PASS / FAIL
Step 5 — .cortexignore live:        PASS / FAIL
Step 6 — Rollback live:             PASS / FAIL
Step 7 — Error log clean:           PASS / FAIL
Step 8 — Production checklist:      PASS / FAIL
------------------------------------------------
OVERALL: X/8 PASSED
================================================
```

Do not stop until all 8 show PASS.

---

## Skill Discovery Check

After adding the skill system, verify it works universally:

**Via MCP tool (works with npx/stdio/any client):**
Call `cortex_list_skills` → must return at least `[{ name: 'cortex', source: 'bundled' }]`
Call `cortex_get_skill` → must return the full `SKILL.md` content

**Via MCP resources (for hosts that support it):**
`resources/list` → must include `cortex://skills/cortex`
`resources/read` with uri `cortex://skills/cortex` → must return SKILL.md content

**Via Antigravity instructions:**
`C:\Users\bidre\.gemini\antigravity\mcp\cortex\instructions.md` → must exist and contain full guide
