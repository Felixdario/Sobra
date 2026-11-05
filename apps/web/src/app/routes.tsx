import { Navigate, type RouteObject } from 'react-router';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AppShell } from '../layout/AppShell';
import { Root } from './Root';

/**
 * Screens load with their route: charts and tables come when needed, and the sign-in forms
 * (react-hook-form + resolvers) stay out of the entry chunk a signed-in visit downloads.
 */
export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      {
        path: '/entrar',
        lazy: () => import('../auth/LoginPage').then((m) => ({ Component: m.LoginPage })),
      },
      {
        path: '/criar-conta',
        lazy: () => import('../auth/RegisterPage').then((m) => ({ Component: m.RegisterPage })),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                index: true,
                lazy: () =>
                  import('../dashboard/DashboardPage').then((m) => ({
                    Component: m.DashboardPage,
                  })),
              },
              {
                path: 'transacoes',
                lazy: () =>
                  import('../transactions/TransactionsPage').then((m) => ({
                    Component: m.TransactionsPage,
                  })),
              },
              {
                path: 'contas',
                lazy: () =>
                  import('../accounts/AccountsPage').then((m) => ({ Component: m.AccountsPage })),
              },
              {
                path: 'categorias',
                lazy: () =>
                  import('../categories/CategoriesPage').then((m) => ({
                    Component: m.CategoriesPage,
                  })),
              },
              {
                path: 'orcamentos',
                lazy: () =>
                  import('../budgets/BudgetsPage').then((m) => ({ Component: m.BudgetsPage })),
              },
              {
                path: 'importar',
                lazy: () =>
                  import('../imports/ImportPage').then((m) => ({ Component: m.ImportPage })),
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
