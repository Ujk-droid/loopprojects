#!/usr/bin/env bash
# Event-driven(ish) watcher for loop4/practice-orders/.
# Polls every 2s (no inotify-tools/watchdog in this sandbox) and, for every
# new file it hasn't seen before, spins up a headless Claude Code run that
# does the estimate-drafting process on its own -- no human prompt typed.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORDERS_DIR="$DIR/practice-orders"
DRAFTS_DIR="$DIR/drafts"
SEEN_FILE="$DIR/.watch_seen"
MCP_CONFIG="$DIR/mcp-config.json"

mkdir -p "$DRAFTS_DIR"
touch "$SEEN_FILE"

# Seed: anything already sitting in practice-orders/ at startup counts as
# "already handled", so we only react to files that show up AFTER this point.
for f in "$ORDERS_DIR"/*; do
    [ -f "$f" ] || continue
    name="$(basename "$f")"
    grep -qxF "$name" "$SEEN_FILE" || echo "$name" >> "$SEEN_FILE"
done

echo "WATCHING $ORDERS_DIR for new order files (poll every 2s)..."

while true; do
    for f in "$ORDERS_DIR"/*; do
        [ -f "$f" ] || continue
        name="$(basename "$f")"
        grep -qxF "$name" "$SEEN_FILE" && continue

        echo "$name" >> "$SEEN_FILE"
        echo "NEW ORDER DETECTED: $name"

        stem="${name%.*}"
        draft="drafts/${stem}-draft.md"
        log="$DRAFTS_DIR/${stem}.log"

        prompt="Read the order file practice-orders/$name. Draft a materials
estimate the same way approved/order-1-estimate.md was done: for every
material mentioned, call the get_material_rate MCP tool to fetch its
current live rate -- never guess or use a training-data price. Write an
explicit line starting with the warning-sign emoji followed by
'ASSUMPTION' for anything the order does not state (gauge, missing
footage, sizes, etc). Build the material cost table and subtotal. Add a
labour line (Rs 3000/day, estimate days from job scope) and a rough
electricity estimate. Then STOP right after 'Subtotal before profit' --
do not invent a profit percentage yourself. End the file with the exact
line: 'AWAITING OWNER-SET PROFIT % to finalize.' Save the whole thing to
$draft. Also append one line per material rate you fetched to
progress.md, matching its existing '- date | keyword | rate' format."

        (cd "$DIR" && claude -p "$prompt" \
                --mcp-config "$MCP_CONFIG" --strict-mcp-config \
                --allowedTools "mcp__steel-rates__get_material_rate Read Write Edit" \
                --output-format text > "$log" 2>&1)
        run_exit=$?

        if [ -f "$DIR/$draft" ]; then
            echo "DRAFTED: loop4/$draft (awaiting owner-set profit %)"
        elif [ "$run_exit" -ne 0 ]; then
            echo "FAILED (exit $run_exit) to draft estimate for $name -- see loop4/drafts/${stem}.log"
        else
            echo "NO DRAFT PRODUCED for $name (claude exited 0 but wrote no draft file) -- see loop4/drafts/${stem}.log"
        fi
    done
    sleep 2
done
