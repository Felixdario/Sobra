import { Outlet } from 'react-router';
import { SessionExpiryListener } from '../auth/SessionExpiryListener';

export function Root() {
  return (
    <>
      <SessionExpiryListener />
      <Outlet />
    </>
  );
}
