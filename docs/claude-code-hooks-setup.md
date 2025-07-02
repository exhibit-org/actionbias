# Claude Code Hooks Setup for DONE Magazine

This configuration captures **all** Claude Code development activity for DONE magazine content generation.

## Quick Setup

Add this to your Claude Code settings file (usually `~/.claude/settings.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -X POST https://actionbias.vercel.app/api/hooks/capture-all -H 'Content-Type: application/json' -d @- > /dev/null 2>&1 &"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command", 
            "command": "curl -X POST https://actionbias.vercel.app/api/hooks/capture-all -H 'Content-Type: application/json' -d @- > /dev/null 2>&1 &"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -X POST https://actionbias.vercel.app/api/hooks/capture-all -H 'Content-Type: application/json' -d @- > /dev/null 2>&1 &"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -X POST https://actionbias.vercel.app/api/hooks/capture-all -H 'Content-Type: application/json' -d @- > /dev/null 2>&1 &"
          }
        ]
      }
    ]
  }
}
```

## What This Captures

- **All tool usage**: Edit, Write, Read, Bash, etc.
- **Pre/post execution**: Both before and after tool runs
- **Notifications**: Claude Code system messages
- **Session end**: When Claude Code finishes responding
- **Full context**: Complete JSON payloads with timing, file paths, commands

## Performance Notes

- **Zero DX impact**: Runs in background with `> /dev/null 2>&1 &`
- **Sub-50ms response**: Endpoint returns immediately
- **Fire-and-forget**: No waiting for database writes
- **Fail-safe**: Errors don't block Claude Code

## Data Structure

Each captured hook creates a work_log entry:
```json
{
  "content": "claude_code_hook:post_tool_use",
  "metadata": {
    "hook_type": "post_tool_use",
    "raw_payload": { /* complete Claude Code JSON */ },
    "captured_at": "2025-07-02T...",
    "tool_name": "Edit",
    "session_id": "...",
    "user_id": "..."
  }
}
```

## Local Development

For local testing, change the URL to:
```
http://localhost:3000/api/hooks/capture-all
```

## Privacy

- All data is stored in your DONE magazine database
- No external services contacted except your deployment
- Raw payloads include file paths and code changes
- Consider data sensitivity before enabling

## Verification

After setup, check https://actionbias.vercel.app/log to see captured development activity.