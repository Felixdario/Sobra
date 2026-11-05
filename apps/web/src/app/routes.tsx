import { Navigate, type RouteObject } from 'react-router';
import { LoginPage } from '../auth/LoginPage';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { RegisterPage } from '../auth/RegisterPage';
import { AppShell } from '../layout/AppShell';
import { Root } from './Root';

/** Screens load with their route: the login stays small, charts and tables come when needed. */
export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/criar-conta', element: <RegisterPage /> },
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
