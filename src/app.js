const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');

const authRoutes       = require('./routes/authRoutes');
const userRoutes       = require('./routes/userRoutes');
const courseRoutes     = require('./routes/courseRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const groupRoutes      = require('./routes/groupRoutes');
const messageRoutes    = require('./routes/messageRoutes');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/courses',     courseRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/groups',      groupRoutes);
app.use('/api/messages',    messageRoutes);

// Global error handler — must have 4 params for Express to treat it as an error handler
app.use((err, req, res, _next) => {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  console.error(`[error] ${req.method} ${req.path} →`, err);
  res.status(status).json({ message });
});

module.exports = app;
