'use client';

// Admin Community — the dashboard shell, sign-in and every staff screen.
//
// As in hgs-frontend: everything exported here is a client component, plain
// data (`*.data.ts`) is imported by deep path, and the UI kit is NOT re-exported
// — screens import it from `./components/ui` directly, so an `app/` page that
// only wants the shell does not pull the whole kit into its import graph.
export { AdminShell } from './components/layout/AdminShell';
export { BackendUnavailablePage } from './components/layout/BackendUnavailablePage';
export { AdminLoginPage } from './components/login/AdminLoginPage';
export { AdminDashboardPage } from './components/dashboard/AdminDashboardPage';
export { AdminPropertiesPage } from './components/properties/AdminPropertiesPage';
export { AdminPropertyEditPage } from './components/properties/AdminPropertyEditPage';
export { AdminInquiriesPage } from './components/inquiries/AdminInquiriesPage';
export { AdminUsersPage } from './components/users/AdminUsersPage';
export { AdminAccountPage } from './components/account/AdminAccountPage';
