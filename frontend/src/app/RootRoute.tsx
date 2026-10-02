import { Outlet, ScrollRestoration } from 'react-router';

/**
 * Top of every route: a new page opens at the top, Back returns to where the
 * person was. Keyed by path, so changing a list's filter or page (search
 * params) does not jump to the top.
 */
export function RootRoute() {
  return (
    <>
      <Outlet />
      <ScrollRestoration getKey={(location) => location.pathname} />
    </>
  );
}
