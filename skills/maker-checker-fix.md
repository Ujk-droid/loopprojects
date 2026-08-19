# Maker-Checker Fix Workflow

A reusable process for applying any small, well-scoped fix so that the
agent who writes the fix is never the same agent who grades it. Works
for any project in this repo (or any repo) and any fix, as long as the
fix can be described as a short, unambiguous set of pass/fail criteria.

## Inputs

- `FIX_SKILL` — path to a skill file describing exactly what the fix
  should do (and, explicitly or implicitly, what it must NOT do).
  Example: `loop4/skills/clean-progress-log.md`.
- `PROJECT_DIR` — path to the project the fix applies to, e.g. `loop4`.
- `SLUG` — short kebab-case name for the change, e.g. `clean-progress-log`.

## Step 1 — Read the fix skill

Read `FIX_SKILL` in full before touching any code. Pull out:

- The exact change to make.
- Any explicit "do not" constraints.
- Any implicit constraints (e.g. "don't touch anything else").

These, and only these, become the PASS/FAIL criteria used in Step 3.
Do not invent additional criteria later, and do not relax the ones
that are there.

## Step 2 — IMPLEMENTER: branch, fix, commit

1. Create an isolated git worktree so the fix never touches the
   working tree of `main`:

   ```
   git worktree add ../<PROJECT_DIR>-<SLUG> -b fix/<SLUG>
   ```

2. Add `<PROJECT_DIR>-<SLUG>/` to `.gitignore` at the repo root if it
   isn't covered already, so the worktree itself is never tracked.
3. In the worktree, apply the minimal change described in `FIX_SKILL`
   — nothing more, nothing unrelated.
4. Commit with a message describing the fix itself (not this workflow).
5. Do **not** push yet.

## Step 3 — REVIEWER: independent check, no implementation memory

The review only counts if the reviewer is genuinely separate from the
implementer — not the same agent recalling "what I meant to do."

Concretely: hand the review off to a fresh, context-free agent (a new
subagent invocation with no shared conversation history — not a fork
of the implementer, which would inherit its memory). Give that
reviewer exactly two things and nothing else:

1. The full contents of `FIX_SKILL`.
2. The diff of the fix (e.g. `git diff main..fix/<SLUG>`).

No explanation of intent, no implementation chat log, no hints.

Reviewer instructions:

1. Read the criteria in `FIX_SKILL`.
2. Read the diff.
3. Check the diff against the criteria line by line: does it make
   exactly the described change, and does it avoid everything the
   skill forbids or anything unrelated?
4. Return a verdict of **PASS** or **FAIL**, with a one-line
   justification per criterion, tied to specific diff lines.

## Step 4 — Act on the verdict

- **PASS** — push the branch and open a PR that references the fix
  skill:

  ```
  git push -u origin fix/<SLUG>
  gh pr create --title "<short description>" \
    --body "Applies <FIX_SKILL>. Reviewed against its criteria: PASS."
  ```

- **FAIL** — do not push, do not open a PR. Report to the requester
  exactly what's wrong: quote the violated criterion and the offending
  diff line(s). Stop there. Leave the branch/worktree in place so a
  human can inspect or fix it — don't silently discard the attempt.

## Cleanup

- After a PASS is merged (or otherwise handled), remove the worktree:

  ```
  git worktree remove ../<PROJECT_DIR>-<SLUG>
  ```

- After a FAIL, leave the worktree until a human decides what to do
  with it.
