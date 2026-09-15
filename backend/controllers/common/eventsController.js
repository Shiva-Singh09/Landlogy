import { addChangeClient, startHeartbeat } from '../../services/common/changeEvents.js';

// ── GET /api/events — SSE stream of data-change notifications ─────
// Auth is enforced by the `authenticate` middleware (JWT via Authorization
// header or ?token= for EventSource, which cannot set headers). The stream
// itself pushes only change notifications; every actual data fetch remains
// the caller's own authorized API request.
export const streamEvents = (req, res) => {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  // Initial confirmation frame the frontend can await before relying on events.
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, role: req.user.role })}\n\n`);

  startHeartbeat();
  const removeClient = addChangeClient(res, req.user.role);
  // 'close' fires on client disconnect/navigation — guaranteed cleanup, no
  // duplicate listeners and no leaked connections across sessions.
  req.on('close', removeClient);
};
