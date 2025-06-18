# ActionBias Web Prototype - Simple Plan

## Goal
Build a minimal web interface to test the core "bias for action" concept: can we make it easier for people to see what to do next and actually do it?

## Core Question
Does a web interface focused on "next action" actually help people take more actions than just using the existing MCP tools?

## Prototype Scope (1-2 days)

### What we're building
- Single page at `/next`
- Big "Next Action" card from `action://next` API
- "Mark Complete" button
- Simple list of other actions
- Basic mobile-friendly styling

### What we're NOT building
- Complex visualizations
- AI chat (maybe add later if core works)
- User accounts/auth
- Advanced features

## Success Criteria
- Can load next action in < 3 seconds
- Can complete action with one click
- Works on mobile
- Feels faster than current workflow

## Tech Choices (simplest possible)
- Add React + Tailwind to existing Next.js app
- Use existing `/api/actions` endpoints
- Basic CSS, no fancy libraries
- Deploy on Vercel (already set up)

## Validation Plan
1. Build it
2. Use it ourselves for a week
3. If it feels better than MCP tools → iterate
4. If not → learn why and pivot

## Next Steps (only if prototype works)
- Add action creation
- Try simple AI integration
- Test with others
- Consider more complex features

---

This is about learning, not building a product. Keep it simple.