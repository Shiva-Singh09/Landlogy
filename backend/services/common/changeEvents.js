// ── In-process Server-Sent Events hub ─────────────────────────────
// Smallest clean change-event foundation: authenticated clients subscribe at
// GET /api/events; controllers call emitChange() after a successful DB
// mutation. No polling, no new infrastructure, no persistence.
//   - Supports multiple connected clients (one Set entry per open stream).
//   - A dead socket is silently dropped on the next write — emit never throws.
//   - Payloads carry ids/status only (never personal data or admin notes).

const clients = new Set(); // { res, role }

export const addChangeClient = (res, role) => {
  const client = { res, role };
  clients.add(client);
  // Returns the unsubscribe function used by the request 'close' handler.
  return () => clients.delete(client);
};

// audience: optional role restriction (e.g. 'admin') so seller connections
// never receive admin-scoped events such as enquiry.* notifications.
export const emitChange = (event, payload = {}, audience = undefined) => {
  if (clients.size === 0) return 0;
  const frame = `event: ${event}\ndata: ${JSON.stringify({ event, ...payload })}\n\n`;
  let delivered = 0;
  for (const client of [...clients]) {
    if (audience && client.role !== audience) continue;
    try {
      client.res.write(frame);
      delivered += 1;
    } catch {
      clients.delete(client);
    }
  }
  return delivered;
};

// Shared keep-alive for every open stream. Comment frames are ignored by
// EventSource but keep intermediaries from closing the idle connection.
let heartbeatTimer = null;
export const startHeartbeat = () => {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const client of [...clients]) {
      try {
        client.res.write(': hb\n\n');
      } catch {
        clients.delete(client);
      }
    }
  }, 25000);
  if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();
};
