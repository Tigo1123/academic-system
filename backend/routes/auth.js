const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// @route   POST /api/auth/login
// @desc    تسجيل دخول المستخدم (مسؤول، محاضر، طالب)
// @access  عام (Public)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // التحقق من المدخلات
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'الرجاء إدخال اسم المستخدم وكلمة المرور.'
    });
  }

  try {
    // 1. البحث عن المستخدم في جدول المستخدمين العام
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة.'
      });
    }

    const user = users[0];

    // 2. التحقق من تطابق كلمة المرور المشفرة
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة.'
      });
    }

    // 3. جلب البيانات التفصيلية بناءً على دور المستخدم
    let profileData = { name: 'مسؤول النظام' };

    if (user.role === 'student') {
      const [students] = await db.query('SELECT * FROM students WHERE user_id = ?', [user.id]);
      if (students.length > 0) {
        profileData = {
          student_id: students[0].id,
          name: students[0].name,
          reg_no: students[0].reg_no
        };
      }
    } else if (user.role === 'lecturer') {
      const [lecturers] = await db.query('SELECT * FROM lecturers WHERE user_id = ?', [user.id]);
      if (lecturers.length > 0) {
        profileData = {
          lecturer_id: lecturers[0].id,
          name: lecturers[0].name,
          email: lecturers[0].email
        };
      }
    }

    // 4. توليد توكن الأمان JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        student_id: profileData.student_id || null,
        lecturer_id: profileData.lecturer_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // 5. إرسال الاستجابة بنجاح
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        ...profileData
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم أثناء تسجيل الدخول.'
    });
  }
});

module.exports = router;
