#!/bin/bash
# Ralph Loop - Executes one task per context window
# With rate limit handling to avoid hammering the API

cd "$(dirname "$0")"

echo "Starting Ralph Loop..."
echo "Working directory: $(pwd)"
echo ""

while true; do
  # Check if any tasks remain
  if ! grep -q "^\- \[ \]" specs/task-list.md; then
    echo "All tasks complete!"
    break
  fi

  echo "=== Starting new Ralph context ==="
  echo "Time: $(date)"

  if claude --dangerously-skip-permissions -p "You are Ralph. Read these files:
- specs/tools.md (tool specifications)
- specs/conventions.md (code patterns)
- specs/task-list.md (your task list)

Pick the FIRST task marked [ ] (not started). Complete ONLY that task.

After completing the task:
1. Run: npm run typecheck
2. Run: npm test
3. If both pass, mark the task [x] in specs/task-list.md
4. Output: RALPH_WIGGUM_COMPLETE

If tests fail, fix the issue and try again. Do not move to other tasks."; then
    echo ""
    echo "=== Ralph context ended successfully ==="
    echo ""
  else
    echo ""
    echo "=== Claude failed (likely rate limit) ==="
    echo "Waiting 5 minutes before retry..."
    echo "Time: $(date)"
    sleep 300
    echo "Resuming..."
    echo ""
  fi

  # Small delay between successful loops
  sleep 2
done

echo "Ralph Loop finished!"
echo "Time: $(date)"
