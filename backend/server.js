const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// استيراد اتصال قاعدة البيانات لضمان تهيئة الجداول تلقائياً عند التشغيل
const db = require('./config/db');

const app = express();

// ----------------------------------------------------
// ⚙️ البرمجيات الوسيطة العامة (Global Middlewares)
// ----------------------------------------------------
app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 🔗 ربط مسارات الـ API (API Routes)
// ----------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/lecturer', require('./routes/lecturer'));
app.use('/api/student', require('./routes/student'));

// ----------------------------------------------------
// 📁 تقديم ملفات الواجهة الأمامية (Serve Frontend Statically)
// ----------------------------------------------------
app.use(express.static(path.join(__dirname, '../frontend')));

// استقبال كافة المسارات الأخرى وتوجيهها للواجهة الرئيسية (SPA Fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ----------------------------------------------------
// 🚀 بدء تشغيل الخادم
// ----------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Electronic Student Results System backend running!`);
  console.log(`📡 API server: http://localhost:${PORT}`);
  console.log(`💻 Web Application: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
