const MORE_ROUTES = ["/more", "/reports", "/bookmarks", "/notifications", "/settings"];

export function isMoreRoute(pathname) {
  return MORE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isNavActive(pathname, item) {
  if (item.to === "/more") return isMoreRoute(pathname);
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
