// In-app SPA navigation. Uses the History API to update the URL without a
// full document reload, so React re-renders the existing tree and the path-based
// router (app/routes.jsx) switches the visible section. Falls back to a server
// navigation only if the History API is unavailable (legacy browsers).
export function navigate(to) {
  if (typeof window === 'undefined' || !window.history || !window.history.pushState) {
    if (typeof window !== 'undefined') window.location.href = to;
    return;
  }
  // Preserve hash fragments and external anchors untouched.
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const revealSidePanel = (serviceType, serviceId) => {
  sidebarTargetService = serviceType;
  sidebarTargetId = serviceId;
  // Client-side SPA navigation only: change the in-app URL without a full
  // document/navigation reload so the existing React router handles the view.
  // window.location.href sets a new URL with no hash/history involvement, which
  // causes the browser to reload the entire document. Using history.replaceState
  // keeps the same React tree and lets the existing router render only the
  // affected route.
  const targetUrl = `/#/${serviceType}/${serviceId}`;
  try {
    if (window.history.replaceState) {
      window.history.replaceState(null, '', targetUrl);
    }
  } catch (_) {
    // Fallback to href when history API is unavailable.
    window.location.href = targetUrl;
  }
  if (typeof window !== 'undefined' && window.landlogy) {
    window.landlogy.emit('portal.navigate', { service: serviceType, id: serviceId });
  }
};

export const clearSidePanel = () => {
  sidebarTargetService = null;
  sidebarTargetId = null;
};

export const isSidePanelVisible = () => sidebarTargetId != null;