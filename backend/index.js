require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mediaRoutes = require('./routes/media');
const matchRoutes = require('./routes/matches');
const campaignRoutes = require('./routes/campaigns');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/settings', settingsRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SmashTeam API' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
