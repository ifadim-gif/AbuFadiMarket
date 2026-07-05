import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { RequireAuth } from '../features/auth/RequireAuth'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SuppliersListPage } from '../features/suppliers/SuppliersListPage'
import { SupplierDetailPage } from '../features/suppliers/SupplierDetailPage'
import { TodayMerchantsPage } from '../features/suppliers/TodayMerchantsPage'
import { InvoiceFormPage } from '../features/invoices/InvoiceFormPage'
import { ChecksListPage } from '../features/checks/ChecksListPage'
import { CheckFormPage } from '../features/checks/CheckFormPage'
import { CheckDetailPage } from '../features/checks/CheckDetailPage'
import { PaySupplierPage } from '../features/payments/PaySupplierPage'
import { SkimDrawerPage } from '../features/payments/SkimDrawerPage'
import { LedgerPage } from '../features/ledger/LedgerPage'
import { DailyClosePage } from '../features/dailyclose/DailyClosePage'
import { ObligationsPage } from '../features/obligations/ObligationsPage'
import { NebulaPage } from '../features/nebula/NebulaPage'
import { OutboxPage } from '../features/capture/OutboxPage'
import { SalesReportPage } from '../features/salesreport/SalesReportPage'
import { BackOfficePage } from '../features/backoffice/BackOfficePage'
import { ExpensesPage } from '../features/expenses/ExpensesPage'
import { OpeningBalancesPage } from '../features/opening/OpeningBalancesPage'
import { RequireRole } from '../features/auth/RequireRole'

export const router = createBrowserRouter(
  [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'suppliers', element: <SuppliersListPage /> },
      { path: 'suppliers/today', element: <TodayMerchantsPage /> },
      { path: 'suppliers/:id', element: <SupplierDetailPage /> },
      {
        path: 'invoices/new',
        element: (
          <RequireRole allow={['admin', 'super_admin', 'cashier']}>
            <InvoiceFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'invoices/:id/edit',
        element: (
          <RequireRole allow={['admin', 'super_admin']}>
            <InvoiceFormPage />
          </RequireRole>
        ),
      },
      { path: 'checks', element: <ChecksListPage /> },
      {
        path: 'checks/new',
        element: (
          <RequireRole allow={['admin', 'super_admin', 'cashier']}>
            <CheckFormPage />
          </RequireRole>
        ),
      },
      { path: 'checks/:id', element: <CheckDetailPage /> },
      {
        path: 'suppliers/:id/pay',
        element: (
          <RequireRole allow={['admin', 'super_admin']}>
            <PaySupplierPage />
          </RequireRole>
        ),
      },
      {
        path: 'skim',
        element: (
          <RequireRole allow={['admin', 'super_admin', 'cashier']}>
            <SkimDrawerPage />
          </RequireRole>
        ),
      },
      { path: 'ledger', element: <LedgerPage /> },
      {
        path: 'close',
        element: (
          <RequireRole allow={['admin', 'super_admin', 'cashier']}>
            <DailyClosePage />
          </RequireRole>
        ),
      },
      {
        path: 'obligations',
        element: (
          <RequireRole allow={['admin', 'super_admin']}>
            <ObligationsPage />
          </RequireRole>
        ),
      },
      { path: 'nebula', element: <NebulaPage /> },
      { path: 'outbox', element: <OutboxPage /> },
      {
        path: 'sales-report',
        element: (
          <RequireRole allow={['admin', 'super_admin', 'cashier']}>
            <SalesReportPage />
          </RequireRole>
        ),
      },
      {
        path: 'back-office',
        element: (
          <RequireRole allow={['admin', 'super_admin']}>
            <BackOfficePage />
          </RequireRole>
        ),
      },
      {
        path: 'expenses',
        element: (
          <RequireRole allow={['admin', 'super_admin', 'cashier']}>
            <ExpensesPage />
          </RequireRole>
        ),
      },
      {
        path: 'opening-balances',
        element: (
          <RequireRole allow={['super_admin']}>
            <OpeningBalancesPage />
          </RequireRole>
        ),
      },
    ],
  },
  ],
  // يطابق base في vite: '/fadi-logic-pro' بالإنتاج، '' (الجذر) بالتطوير.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
)
