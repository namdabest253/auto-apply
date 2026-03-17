#!/bin/bash
# AI Discovery agent launcher
# Usage: ./ai-discover.sh <runId> <prompt>

set -e

RUN_ID="$1"
PROMPT_FILE="$2"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_DIR/.discover/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/${RUN_ID}.log"

export HOME=/root
export PATH="/root/.local/bin:$PATH"

echo "[$(date)] Starting AI discovery for run ${RUN_ID}" >> "$LOG_FILE"

# Run claude with the prompt, logging everything
cat "$PROMPT_FILE" | claude -p \
  --permission-mode auto \
  --model sonnet \
  --allowedTools "WebSearch,WebFetch,Bash" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "[$(date)] Claude exited with code ${EXIT_CODE}" >> "$LOG_FILE"

# Clean up prompt file
rm -f "$PROMPT_FILE"

# Mark run as complete or failed
cd /root/job
if [ $EXIT_CODE -eq 0 ]; then
  npx tsx src/scripts/complete-run.ts "$RUN_ID" >> "$LOG_FILE" 2>&1
else
  npx tsx src/scripts/complete-run.ts "$RUN_ID" --failed "claude exited with code $EXIT_CODE" >> "$LOG_FILE" 2>&1
fi

echo "[$(date)] Done" >> "$LOG_FILE"
