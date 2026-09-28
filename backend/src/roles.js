// Rôles du système (3 acteurs) :
//   - visiteur : non authentifié (aucune ligne BDD)
//   - client   : rôle 'client'
//   - administrateur : rôle 'admin'
const ROLES = {
  CLIENT: 'client',
  ADMIN: 'admin',
}

const RBAC = {
  public: [
    'POST /api/auth/register',
    'POST /api/auth/login',
    'POST /api/auth/otp/email/send',
    'POST /api/auth/otp/email/verify',
    'POST /api/auth/activate',
    'POST /api/auth/resend-activation',
    'GET /api/vehicles',
    'GET /api/vehicles/:id',
    'GET /api/vehicles/:id/image',
    'GET /api/vehicles/:id/reviews',
    'GET /api/vehicles/:id/reviews/summary',
    'GET /api/vehicles/:id/config',
    'GET /api/vehicles/price-range',
    'POST /api/payments/webhook',
  ],
  client: [
    'GET /api/auth/me',
    'PUT /api/auth/change-password',
    'GET /api/cart',
    'POST /api/cart',
    'POST /api/payments/create-checkout-session',
    'GET /api/orders/mine',
    'POST /api/reviews',
    'GET /api/favorites',
    'POST /api/favorites',
    'DELETE /api/favorites/:vehicleId',
  ],
  admin: [
    'GET /api/users',
    'GET /api/users/:id',
    'PUT /api/users/:id/role',
    'DELETE /api/users/:id',
    'GET /api/admin/stats',
    'GET /api/admin/users',
    'POST /api/admin/create-admin',
    'GET /api/admin/vehicles',
    'POST /api/admin/vehicles',
    'PUT /api/admin/vehicles/:id',
    'DELETE /api/admin/vehicles/:id',
    'GET /api/admin/orders',
    'GET /api/admin/orders/summary',
    'PUT /api/admin/orders/:id/status',
    'POST /api/admin/orders/:id/refund',
    'POST /api/admin/orders/:id/resend-receipt',
    'GET /api/admin/reviews',
    'PUT /api/admin/reviews/:id/status',
    'DELETE /api/admin/reviews/:id',
    'GET /api/admin/notifications',
    'POST /api/admin/notifications/:id/read',
    'POST /api/admin/notifications/read-all',
    'GET /api/admin/dashboard/summary',
    'GET /api/admin/dashboard/revenue-by-month',
    'GET /api/admin/dashboard/orders-by-drivetrain',
    'GET /api/admin/dashboard/recent-activity',
    'GET /api/admin/clients',
    'GET /api/admin/clients/:id',
    'GET /api/admin/reports/orders',
    'GET /api/admin/reports/vehicles',
    'GET /api/admin/reports/revenue',
  ],
}

module.exports = { ROLES, RBAC }