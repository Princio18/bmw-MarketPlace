require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { requireJwtSecret } = require('./auth/tokens')
const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const adminVehicleRoutes = require('./routes/adminVehicleRoutes')
const adminAccessoryRoutes = require('./routes/adminAccessoryRoutes')
const adminOrderRoutes = require('./routes/adminOrderRoutes')
const adminReviewRoutes = require('./routes/adminReviewRoutes')
const adminNotificationRoutes = require('./routes/adminNotificationRoutes')
const adminDashboardRoutes = require('./routes/adminDashboardRoutes')
const adminClientRoutes = require('./routes/adminClientRoutes')
const adminReportRoutes = require('./routes/adminReportRoutes')
const adminTeamRoutes = require('./routes/adminTeamRoutes')
const vehiclesRoutes = require('./routes/vehicles')
const accessoriesRoutes = require('./routes/accessoriesRoutes')
const cartRoutes = require('./routes/cartRoutes')
const reviewRoutes = require('./routes/reviews')
const myOrderRoutes = require('./routes/myOrderRoutes')
const paymentWebhookRoutes = require('./routes/paymentWebhookRoute')
const paymentsRoutes = require('./routes/payments')

requireJwtSecret()

const app = express()

app.use(cors())

// Le webhook Stripe doit recevoir le corps BRUT (signature vérifiée) :
// monté AVANT express.json() global pour cette route précise.
app.use('/api/payments/webhook', paymentWebhookRoutes)

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BMW AutoSell API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/vehicles', adminVehicleRoutes)
app.use('/api/admin/accessories', adminAccessoryRoutes)
app.use('/api/admin/orders', adminOrderRoutes)
app.use('/api/admin/reviews', adminReviewRoutes)
app.use('/api/admin/notifications', adminNotificationRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/clients', adminClientRoutes)
app.use('/api/admin/reports', adminReportRoutes)
app.use('/api/admin/team', adminTeamRoutes)
app.use('/api/vehicles', vehiclesRoutes)
app.use('/api/accessories', accessoriesRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/orders', myOrderRoutes)
app.use('/api/payments', paymentsRoutes)

app.use((err, req, res, next) => {
  console.error('[server]', err)
  res.status(500).json({ error: 'Erreur interne du serveur.' })
})

module.exports = app
