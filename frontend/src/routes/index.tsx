import type { ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RoleGuard } from './guards/RoleGuard'
import UnauthorizedPage from './UnauthorizedPage'
import NotFoundPage from './NotFoundPage'
import TicketPurchasePage from '@/features/tickets/TicketPurchasePage'
import AdminEventsPage from '@/panels/admin/AdminEventsPage'
import AdminMenuPage from '@/panels/admin/AdminMenuPage'
import AdminInventoryPage from '@/panels/admin/AdminInventoryPage'
import AttendeeListPage from '@/panels/admin/AttendeeListPage'

import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import RecoverPage from '@/features/auth/RecoverPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'

import AdminLayout from '@/panels/admin/AdminLayout'
import AdminHome from '@/panels/admin/AdminHome'
import MeseroLayout from '@/panels/mesero/MeseroLayout'
import MeseroHome from '@/panels/mesero/MeseroHome'
import PorteroLayout from '@/panels/portero/PorteroLayout'
import PorteroHome from '@/panels/portero/PorteroHome'
import ClienteLayout from '@/panels/cliente/ClienteLayout'
import ClienteHome from '@/panels/cliente/ClienteHome'
import CartaPage from '@/features/carta/CartaPage'

/** Rutas de la app sin la portada: quien monta la app decide qué se muestra en '/'. */
const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/recover', element: <RecoverPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },
  { path: '/comprar/:event_id', element: <TicketPurchasePage /> },
  { path: '/mesa/:table_number', element: <CartaPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    path: '/admin',
    element: <RoleGuard allowedRoles={['admin']} />,
    children: [{
      element: <AdminLayout />,
      children: [
        { index: true, element: <AdminHome /> },
        { path: 'eventos', element: <AdminEventsPage /> },
        { path: 'eventos/:event_id/asistentes', element: <AttendeeListPage /> },
        { path: 'menu', element: <AdminMenuPage /> },
        { path: 'inventario', element: <AdminInventoryPage /> },
      ],
    }],
  },
  {
    path: '/mesero',
    element: <RoleGuard allowedRoles={['mesero']} />,
    children: [{ element: <MeseroLayout />, children: [{ index: true, element: <MeseroHome /> }] }],
  },
  {
    path: '/portero',
    element: <RoleGuard allowedRoles={['portero']} />,
    children: [{ element: <PorteroLayout />, children: [{ index: true, element: <PorteroHome /> }] }],
  },
  {
    path: '/cliente',
    element: <RoleGuard allowedRoles={['cliente']} />,
    children: [{ element: <ClienteLayout />, children: [{ index: true, element: <ClienteHome /> }] }],
  },
  { path: '*', element: <NotFoundPage /> },
]

/** Se crea al montar (no al importar) porque el router del navegador lee window. */
export function createAppRouter(homeElement: ReactNode) {
  return createBrowserRouter([{ path: '/', element: homeElement }, ...appRoutes])
}
