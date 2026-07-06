import { createBrowserRouter, Navigate } from 'react-router-dom'
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
import { RolesAdminPage } from '../features/roles/RolesAdminPage'
import { RequireCapability } from '../features/auth/RequireCapability'

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
      // الشاشة الافتراضية عند فتح التطبيق: تجار اليوم.
      { index: true, element: <Navigate to="/suppliers/today" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'suppliers', element: <SuppliersListPage /> },
      { path: 'suppliers/today', element: <TodayMerchantsPage /> },
      { path: 'suppliers/:id', element: <SupplierDetailPage /> },
      {
        path: 'invoices/new',
        element: (
          <RequireCapability cap="capture_documents">
            <InvoiceFormPage />
          </RequireCapability>
        ),
      },
      {
        path: 'invoices/:id/edit',
        element: (
          <RequireCapability cap="manage_finance">
            <InvoiceFormPage />
          </RequireCapability>
        ),
      },
      { path: 'checks', element: <ChecksListPage /> },
      {
        path: 'checks/new',
        element: (
          <RequireCapability cap="capture_documents">
            <CheckFormPage />
          </RequireCapability>
        ),
      },
      { path: 'checks/:id', element: <CheckDetailPage /> },
      {
        path: 'suppliers/:id/pay',
        element: (
          <RequireCapability cap="manage_finance">
            <PaySupplierPage />
          </RequireCapability>
        ),
      },
      {
        path: 'skim',
        element: (
          <RequireCapability cap="capture_documents">
            <SkimDrawerPage />
          </RequireCapability>
        ),
      },
      { path: 'ledger', element: <LedgerPage /> },
      {
        path: 'close',
        element: (
          <RequireCapability cap="capture_documents">
            <DailyClosePage />
          </RequireCapability>
        ),
      },
      {
        path: 'obligations',
        element: (
          <RequireCapability cap="manage_finance">
            <ObligationsPage />
          </RequireCapability>
        ),
      },
      { path: 'nebula', element: <NebulaPage /> },
      { path: 'outbox', element: <OutboxPage /> },
      {
        path: 'sales-report',
        element: (
          <RequireCapability cap="capture_documents">
            <SalesReportPage />
          </RequireCapability>
        ),
      },
      {
        path: 'back-office',
        element: (
          <RequireCapability cap="manage_finance">
            <BackOfficePage />
          </RequireCapability>
        ),
      },
      {
        path: 'expenses',
        element: (
          <RequireCapability cap="capture_documents">
            <ExpensesPage />
          </RequireCapability>
        ),
      },
      {
        path: 'opening-balances',
        element: (
          <RequireCapability cap="manage_system">
            <OpeningBalancesPage />
          </RequireCapability>
        ),
      },
      {
        path: 'admin/roles',
        element: (
          <RequireCapability cap="manage_system">
            <RolesAdminPage />
          </RequireCapability>
        ),
      },
    ],
  },
  ],
  // يطابق base في vite: '/fadi-logic-pro' بالإنتاج، '' (الجذر) بالتطوير.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
)
