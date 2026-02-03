// index.js
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const EmployeesAcc = require('./DataBase/Models/EmployessAcc');
const connectDb = require('./DataBase/DBConnection');

// Routers
const UserRoute = require('./Router/userRoute.js');
const ProdcutsRoute = require('./Router/ProdcutsRoute');
const SubCategoryRoute = require('./Router/SubcatogryRoutes.js');
const CategoryRoute = require('./Router/CategoryRoute.js');
const MoneyRoute = require('./Router/MoneyRoute.js');
const ImageKitRoute = require('./Router/imagekit.js');
const DesignRoute = require('./Router/DesignRoutes.js');
const paymentRoute = require('./Router/paymentRoutes.js');
const completedorderRoutes = require('./Router/CompletedOrderRoutes.js');
const orderRoutes = require('./Router/orderRoutes.js');
const analyticsRouter = require('./Router/analytics');
const { router: dataRouter } = require('./Router/DataRoutes.js');
const InvoiceRoutes = require('./Router/InvoiceRoutes.js');
const BannerRoutes = require('./Router/BannerRoutes.js');
const walletRoutes = require('./Router/walletRoutes.js');
const blogRoutes = require('./Router/blogRoutes.js');
const landingPageRoutes = require('./Router/LandingPageRoutes.js');
const geolocationRoutes = require('./Router/geolocationRoutes.js');
const stockRoutes = require('./Router/stockRoutes.js');

const app = express();
const port = process.env.PORT || 3000;

/* =========================
   TRUST PROXY
   ========================= */
app.set('trust proxy', 1);

/* =========================
   COMPRESSION
   ========================= */
app.use(compression());

/* =========================
   ✅ CORS
   ========================= */
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'https://duco-67o5.onrender.com',
  'https://ducoart.com',
  'https://www.ducoart.com',
];

const envAllowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server calls (no Origin header)
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin)) return callback(null, true);

    // Allow any secure subdomain of ducoart.com
    if (/^https:\/\/([a-z0-9-]+\.)*ducoart\.com$/i.test(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Be permissive here to avoid preflight failures due to extra headers.
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* =========================
   BODY PARSERS
   ========================= */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/* =========================
   DATABASE
   ========================= */
connectDb();

/* =========================
   HEALTH CHECK
   ========================= */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   ROOT
   ========================= */
app.get('/', (_req, res) => {
  res.send('Duco Backend Server is running!');
});

/* =========================
   ROUTES
   ========================= */
app.use('/user', UserRoute);
app.use('/products', ProdcutsRoute);
app.use('/subcategory', SubCategoryRoute);
app.use('/category', CategoryRoute);
app.use('/money', MoneyRoute);

app.use('/api/imagekit', ImageKitRoute);
app.use('/api', DesignRoute);
app.use('/api/payment', paymentRoute);
app.use('/api', completedorderRoutes);
app.use('/api', orderRoutes);

app.use('/api/analytics', analyticsRouter);
app.use('/api', require('./Router/LogisticsRoutes'));
app.use('/api', require('./Router/chargePlanRoutes'));
app.use('/api', require('./Router/bankDetails'));
app.use('/api', require('./Router/employeesRoutes.js'));
app.use('/api', require('./Router/corporateSettingsRoutes'));
app.use('/api', require('./Router/trackingRoutes'));
app.use('/api', BannerRoutes);
app.use('/data', dataRouter);
app.use('/api', InvoiceRoutes);
app.use('/api', walletRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api', landingPageRoutes);
app.use('/api', geolocationRoutes);
app.use('/api', stockRoutes);

/* =========================
   ADMIN LOGIN
   ========================= */
app.post('/api/admin/check', async (req, res) => {
  const { userid, password } = req.body || {};

  if (!userid || !password) {
    return res.status(400).json({ ok: false });
  }

  if (
    userid === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ ok: true });
  }

  try {
    const user = await EmployeesAcc.findOne({ employeeid: userid });
    if (!user) return res.status(401).json({ ok: false });

    const ok = await bcrypt.compare(password, user.password);
    return ok ? res.json({ ok: true }) : res.status(401).json({ ok: false });
  } catch {
    return res.status(500).json({ ok: false });
  }
});

/* =========================
   404
   ========================= */
app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Route not found' });
});

/* =========================
   ERROR HANDLER
   ========================= */
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ ok: false, message: err.message });
});

/* =========================
   START SERVER
   ========================= */
app.listen(port, () => {
  console.log(`✅ Backend running on port ${port}`);
});
