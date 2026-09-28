import { Route, Routes, Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import FindBmwCentre from './pages/FindBmwCentre'
import AllModels from './pages/AllModels'
import VehicleDetail from './pages/VehicleDetail'
import Cart from './pages/Cart'
import OrderConfirmation from './pages/OrderConfirmation'
import AdminOtp from './pages/AdminOtp'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Clients from './pages/admin/Clients'
import Orders from './pages/admin/Orders'
import Payment from './pages/admin/Payment'
import Vehicles from './pages/admin/Vehicles'
import VehicleFormPage from './pages/admin/VehicleFormPage'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'
import MyOrders from './pages/MyOrders'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  const { t } = useTranslation()
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/find-a-bmw-centre" element={<FindBmwCentre />} />
      <Route path="/all-models" element={<AllModels />} />
      <Route
        path="/vehicles/:id"
        element={
          <ProtectedRoute allowedRoles={['client', 'admin']}>
            <VehicleDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/order-confirmation" element={<OrderConfirmation />} />
      <Route
        path="/my-orders"
        element={
          <ProtectedRoute allowedRoles={['client', 'admin']}>
            <MyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedRoute allowedRoles={['client', 'admin']}>
            <Cart />
          </ProtectedRoute>
        }
      />
      <Route path="/otp" element={<AdminOtp />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="orders" element={<Orders />} />
        <Route path="payment" element={<Payment />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="vehicles/new" element={<VehicleFormPage />} />
        <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route
        path="/vehicules"
        element={
          <div className="container mx-auto px-4 py-10">
            <Card>
              <CardHeader>
                <CardTitle>{t('pages.vehicules.title')}</CardTitle>
                <CardDescription>
                  {t('pages.vehicules.desc')}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground">
                  {t('pages.vehicules.soon')}
                </p>

                <Button asChild className="w-fit">
                  <Link to="/">{t('common.backHome')}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      />

      <Route
        path="/contact"
        element={
          <div className="container mx-auto px-4 py-10">
            <Card>
              <CardHeader>
                <CardTitle>{t('pages.contact.title')}</CardTitle>
                <CardDescription>
                  {t('pages.contact.desc')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button asChild>
                  <Link to="/">{t('common.backHome')}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      />
    </Routes>
  )
}

export default App
