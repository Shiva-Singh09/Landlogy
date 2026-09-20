export function getCurrentPathname() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

export function getClientPortalSection() {
  const path = getCurrentPathname();

  if (path === '/client-portal') return 'dashboard';
  if (path === '/client-portal/properties') return 'properties';
  if (path === '/client-portal/add-property') return 'add-property';
  if (path === '/client-portal/status') return 'status';
  if (path === '/client-portal/documents') return 'documents';
  if (path === '/client-portal/notifications') return 'notifications';
  if (path === '/client-portal/profile') return 'profile';
  if (path === '/client-portal/support') return 'support';
  if (path.startsWith('/client-portal/properties/')) return 'property-detail';

  return 'dashboard';
}

export function getClientPortalPropertyId() {
  const path = getCurrentPathname();
  const match = path.match(/^\/client-portal\/properties\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getCurrentRoute() {
  const path = getCurrentPathname();

  if (path === '/client-login') return 'client-login';
  if (path === '/forgot-password' || path === '/client-forgot-password') return 'forgot-password';
  if (path.startsWith('/client-portal')) return 'client-portal';
  return 'public';
}
