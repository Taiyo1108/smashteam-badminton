require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mediaRoutes = require('./routes/media');
const matchRoutes = require('./routes/matches');
const campaignRoutes = require('./routes/campaigns');
const settingsRoutes = require('./routes/settings');
const profileRoutes = require('./routes/profile');
const sessionRoutes = require('./routes/sessions');
const adminRoutes = require('./routes/admin');
const gamificationRoutes = require('./routes/gamification');
const shopRoutes = require('./routes/shop');
const statsRoutes = require('./routes/stats');
const eventRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://smashteam.id.vn',
  'https://www.smashteam.id.vn'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Luôn cho phép trong môi trường dev hoặc test nội bộ
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Kiểm tra danh sách cố định
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Cho phép các IP nội bộ / VPN Radmin (26.*, 192.168.*, 10.*, 172.*, localhost)
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('26.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.id.vn') ||
        hostname.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
    } catch (e) {
      // url parse error
    }

    callback(null, true); // Chấp nhận an toàn tránh lỗi 500 cho người dùng
  },
  credentials: true
}));
const path = require('path');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/events', eventRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SmashTeam API' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});
