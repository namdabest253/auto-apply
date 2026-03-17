#!/bin/bash
# Watches /tmp/ai-discover-trigger/ for new trigger files and launches claude
# Run this alongside your app: ./src/scripts/ai-discover-watcher.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TRIGGER_DIR="$PROJECT_DIR/.discover/trigger"
mkdir -p "$TRIGGER_DIR"

export HOME=/root
export PATH="/root/.local/bin:$PATH"

echo "[watcher] AI Discovery watcher started, watching $TRIGGER_DIR"

while true; do
  for trigger_file in "$TRIGGER_DIR"/*.trigger; do
    [ -f "$trigger_file" ] || continue

    # Read the run ID and prompt file path from the trigger
    RUN_ID=$(head -1 "$trigger_file")
    PROMPT_FILE=$(sed -n '2p' "$trigger_file")

    echo "[watcher] Found trigger for run $RUN_ID"

    # Remove trigger file immediately to avoid re-processing
    rm -f "$trigger_file"

    # Launch the discovery script in background
    LOG_DIR="$PROJECT_DIR/.discover/logs"
    mkdir -p "$LOG_DIR"
    LOG_FILE="$LOG_DIR/${RUN_ID}.log"
    nohup "$PROJECT_DIR/src/scripts/ai-discover.sh" "$RUN_ID" "$PROMPT_FILE" </dev/null >"$LOG_FILE" 2>&1 &

    echo "[watcher] Launched run $RUN_ID (PID: $!), log: $LOG_FILE"
  done
  sleep 1
done
