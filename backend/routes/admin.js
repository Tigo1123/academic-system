const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

// تأمين جميع المسارات أدناه لـ Admin فقط
router.use(protect);
router.use(restrictTo('admin'));

// ----------------------------------------------------
// 📊 إحصائيات لوحة التحكم (Admin Dashboard Stats)
// ----------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const [[{ studentsCount }]] = await db.query('SELECT COUNT(*) AS studentsCount FROM students');
    const [[{ lecturersCount }]] = await db.query('SELECT COUNT(*) AS lecturersCount FROM lecturers');
    const [[{ coursesCount }]] = await db.query('SELECT COUNT(*) AS coursesCount FROM courses');

    res.json({
      success: true,
      stats: {
        students: studentsCount,
        lecturers: lecturersCount,
        courses: coursesCount
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب إحصائيات لوحة التحكم.' });
  }
});

// ----------------------------------------------------
// 👨🎓 إدارة الطلاب (Students Management)
// ----------------------------------------------------

// جلب قائمة الطلاب
router.get('/students', async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT s.id, s.name, s.reg_no, u.username, s.user_id 
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `);
    res.json({ success: true, students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب قائمة الطلاب.' });
  }
});

// إضافة طالب جديد
router.post('/students', async (req, res) => {
  const { name, reg_no, username, password } = req.body;

  if (!name || !reg_no || !username || !password) {
    return res.status(400).json({ success: false, message: 'الرجاء إدخال جميع الحقول المطلوبة للطلب.' });
  }

  const poolConn = db.getPool();
  const conn = await poolConn.getConnection();
  try {
    await conn.beginTransaction();

    // 1. تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. إنشاء حساب في جدول المستخدمين العام
    const [userResult] = await conn.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'student']
    );
    const userId = userResult.insertId;

    // 3. إضافة البيانات إلى جدول الطلاب
    await conn.query(
      'INSERT INTO students (user_id, name, reg_no, password) VALUES (?, ?, ?, ?)',
      [userId, name, reg_no, hashedPassword]
    );

    await conn.commit();
    res.status(201).json({ success: true, message: 'تم إضافة الطالب بنجاح وبأمان!' });
  } catch (error) {
    await conn.rollback();
    console.error('Error adding student:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'رقم التسجيل أو اسم المستخدم موجود مسبقاً.' });
    } else {
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء إضافة الطالب.' });
    }
  } finally {
    conn.release();
  }
});

// حذف طالب
router.delete('/students/:id', async (req, res) => {
  const studentId = req.params.id;
  try {
    // نجلب الـ user_id المرتبط بالطالب أولاً لحذف الحساب بالكامل
    const [students] = await db.query('SELECT user_id FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'الطالب غير موجود.' });
    }

    const userId = students[0].user_id;

    // حذف الحساب من جدول المستخدمين (سيحذف تفاصيله من جدول الطلاب تلقائياً بسبب ON DELETE CASCADE)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'تم حذف الطالب وكافة سجلاته بنجاح.' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف الطالب.' });
  }
});

// ----------------------------------------------------
// 👨🏫 إدارة المحاضرين (Lecturers Management)
// ----------------------------------------------------

// جلب قائمة المحاضرين
router.get('/lecturers', async (req, res) => {
  try {
    const [lecturers] = await db.query(`
      SELECT l.id, l.name, l.email, u.username, l.user_id 
      FROM lecturers l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.id DESC
    `);
    res.json({ success: true, lecturers });
  } catch (error) {
    console.error('Error fetching lecturers:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب قائمة المحاضرين.' });
  }
});

// إضافة محاضر جديد
router.post('/lecturers', async (req, res) => {
  const { name, email, username, password } = req.body;

  if (!name || !email || !username || !password) {
    return res.status(400).json({ success: false, message: 'الرجاء إدخال جميع الحقول المطلوبة.' });
  }

  const poolConn = db.getPool();
  const conn = await poolConn.getConnection();
  try {
    await conn.beginTransaction();

    // 1. تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. إنشاء حساب في جدول المستخدمين
    const [userResult] = await conn.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'lecturer']
    );
    const userId = userResult.insertId;

    // 3. إضافة البيانات لجدول المحاضرين
    await conn.query(
      'INSERT INTO lecturers (user_id, name, email, password) VALUES (?, ?, ?, ?)',
      [userId, name, email, hashedPassword]
    );

    await conn.commit();
    res.status(201).json({ success: true, message: 'تم إضافة المحاضر بنجاح!' });
  } catch (error) {
    await conn.rollback();
    console.error('Error adding lecturer:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'البريد الإلكتروني أو اسم المستخدم موجود مسبقاً.' });
    } else {
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء إضافة المحاضر.' });
    }
  } finally {
    conn.release();
  }
});

// حذف محاضر
router.delete('/lecturers/:id', async (req, res) => {
  const lecturerId = req.params.id;
  try {
    const [lecturers] = await db.query('SELECT user_id FROM lecturers WHERE id = ?', [lecturerId]);
    if (lecturers.length === 0) {
      return res.status(404).json({ success: false, message: 'المحاضر غير موجود.' });
    }

    const userId = lecturers[0].user_id;

    // حذف الحساب من جدول المستخدمين (سيحذف البيانات الفرعية تلقائياً)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'تم حذف المحاضر بنجاح.' });
  } catch (error) {
    console.error('Error deleting lecturer:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف المحاضر.' });
  }
});

// ----------------------------------------------------
// 📚 إدارة المواد الدراسية (Courses Management)
// ----------------------------------------------------

// جلب قائمة المواد
router.get('/courses', async (req, res) => {
  try {
    const [courses] = await db.query('SELECT * FROM courses ORDER BY id DESC');
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب قائمة المواد.' });
  }
});

// إضافة مادة جديدة
router.post('/courses', async (req, res) => {
  const { course_name, course_code, credits } = req.body;

  if (!course_name || !course_code) {
    return res.status(400).json({ success: false, message: 'اسم المادة ورمز المادة مطلوبان.' });
  }

  try {
    await db.query(
      'INSERT INTO courses (course_name, course_code, credits) VALUES (?, ?, ?)',
      [course_name, course_code, credits || 3]
    );
    res.status(201).json({ success: true, message: 'تم إضافة المادة الدراسية بنجاح!' });
  } catch (error) {
    console.error('Error adding course:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'رمز المادة موجود مسبقاً.' });
    } else {
      res.status(500).json({ success: false, message: 'فشل في إضافة المادة.' });
    }
  }
});

// حذف مادة
router.delete('/courses/:id', async (req, res) => {
  const courseId = req.params.id;
  try {
    await db.query('DELETE FROM courses WHERE id = ?', [courseId]);
    res.json({ success: true, message: 'تم حذف المادة بنجاح.' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف المادة الدراسية.' });
  }
});

// ----------------------------------------------------
// 🔗 الربط والتسجيل (Enrollments & Assignments)
// ----------------------------------------------------

// ربط طالب بمادة (تسجيل الطالب في المادة)
router.post('/enroll-student', async (req, res) => {
  const { student_id, course_id } = req.body;

  if (!student_id || !course_id) {
    return res.status(400).json({ success: false, message: 'الرجاء اختيار الطالب والمادة.' });
  }

  const poolConn = db.getPool();
  const conn = await poolConn.getConnection();
  try {
    await conn.beginTransaction();

    // 1. تسجيل الطالب في جدول المواد المسجلة
    await conn.query(
      'INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)',
      [student_id, course_id]
    );

    // 2. إدراج سجل فارغ في جدول النتائج لتمكين المحاضر من إدخال الدرجة لاحقاً
    await conn.query(
      'INSERT INTO results (student_id, course_id, marks, grade) VALUES (?, ?, NULL, NULL) ON DUPLICATE KEY UPDATE student_id=student_id',
      [student_id, course_id]
    );

    await conn.commit();
    res.status(201).json({ success: true, message: 'تم تسجيل الطالب في المادة بنجاح وتجهيز كشف الرصد!' });
  } catch (error) {
    await conn.rollback();
    console.error('Error enrolling student:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'هذا الطالب مسجل في هذه المادة مسبقاً.' });
    } else {
      res.status(500).json({ success: false, message: 'فشل في تسجيل الطالب في المادة.' });
    }
  } finally {
    conn.release();
  }
});

// إسناد مادة لمحاضر
router.post('/assign-lecturer', async (req, res) => {
  const { lecturer_id, course_id } = req.body;

  if (!lecturer_id || !course_id) {
    return res.status(400).json({ success: false, message: 'الرجاء اختيار المحاضر والمادة.' });
  }

  try {
    await db.query(
      'INSERT INTO lecturer_courses (lecturer_id, course_id) VALUES (?, ?)',
      [lecturer_id, course_id]
    );
    res.status(201).json({ success: true, message: 'تم إسناد المادة للمحاضر بنجاح!' });
  } catch (error) {
    console.error('Error assigning lecturer:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'هذه المادة مسندة لهذا المحاضر مسبقاً.' });
    } else {
      res.status(500).json({ success: false, message: 'فشل في إسناد المادة للمحاضر.' });
    }
  }
});

module.exports = router;
