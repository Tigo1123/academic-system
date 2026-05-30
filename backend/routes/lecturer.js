const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

// تأمين جميع المسارات للمحاضرين فقط
router.use(protect);
router.use(restrictTo('lecturer'));

// دالة مساعدة لحساب التقدير الحرفي تلقائياً بناءً على الدرجة
function calculateGrade(marks) {
  const m = parseFloat(marks);
  if (m >= 90) return 'A';
  if (m >= 85) return 'B+';
  if (m >= 80) return 'B';
  if (m >= 75) return 'C+';
  if (m >= 70) return 'C';
  if (m >= 65) return 'D+';
  if (m >= 60) return 'D';
  return 'F';
}

// ----------------------------------------------------
// 📚 جلب المواد المسندة للمحاضر
// ----------------------------------------------------
router.get('/courses', async (req, res) => {
  const lecturerId = req.user.lecturer_id;

  if (!lecturerId) {
    return res.status(400).json({ success: false, message: 'معرف المحاضر غير موجود في الجلسة.' });
  }

  try {
    const [courses] = await db.query(`
      SELECT c.id, c.course_name, c.course_code, c.credits
      FROM lecturer_courses lc
      JOIN courses c ON lc.course_id = c.id
      WHERE lc.lecturer_id = ?
    `, [lecturerId]);

    res.json({ success: true, courses });
  } catch (error) {
    console.error('Error fetching lecturer courses:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب قائمة المواد المسندة.' });
  }
});

// ----------------------------------------------------
// 👥 جلب الطلاب المسجلين في مادة معينة مع درجاتهم
// ----------------------------------------------------
router.get('/courses/:courseId/students', async (req, res) => {
  const lecturerId = req.user.lecturer_id;
  const courseId = req.params.courseId;

  try {
    // 1. التحقق الأمني: التأكد من أن المادة مسندة فعلاً لهذا المحاضر
    const [assignment] = await db.query(`
      SELECT * FROM lecturer_courses 
      WHERE lecturer_id = ? AND course_id = ?
    `, [lecturerId, courseId]);

    if (assignment.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح لك بعرض طلاب هذه المادة لأنها غير مسندة إليك.' 
      });
    }

    // 2. جلب الطلاب المسجلين بالاستعانة بـ LEFT JOIN مع جدول النتائج لجلب الدرجة والتقدير الحاليين
    const [students] = await db.query(`
      SELECT s.id AS student_id, s.name, s.reg_no, r.marks, r.grade
      FROM student_courses sc
      JOIN students s ON sc.student_id = s.id
      LEFT JOIN results r ON r.student_id = s.id AND r.course_id = sc.course_id
      WHERE sc.course_id = ?
      ORDER BY s.name ASC
    `, [courseId]);

    res.json({ success: true, students });
  } catch (error) {
    console.error('Error fetching course students:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب قائمة الطلاب للمادة.' });
  }
});

// ----------------------------------------------------
// ✍️ رصد أو تعديل درجة طالب في مادة
// ----------------------------------------------------
router.post('/grade', async (req, res) => {
  const lecturerId = req.user.lecturer_id;
  const { student_id, course_id, marks } = req.body;

  if (!student_id || !course_id || marks === undefined || marks === '') {
    return res.status(400).json({ success: false, message: 'الرجاء إدخال الطالب، المادة، والدرجة.' });
  }

  const numericMarks = parseFloat(marks);
  if (isNaN(numericMarks) || numericMarks < 0 || numericMarks > 100) {
    return res.status(400).json({ success: false, message: 'الرجاء إدخال درجة صالحة بين 0 و 100.' });
  }

  try {
    // 1. التحقق الأمني: التأكد من أن المادة مسندة للمحاضر
    const [assignment] = await db.query(`
      SELECT * FROM lecturer_courses 
      WHERE lecturer_id = ? AND course_id = ?
    `, [lecturerId, course_id]);

    if (assignment.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح لك برصد درجات هذه المادة.' 
      });
    }

    // 2. حساب التقدير تلقائياً
    const grade = calculateGrade(numericMarks);

    // 3. رصد أو تحديث الدرجة في قاعدة البيانات
    await db.query(`
      INSERT INTO results (student_id, course_id, marks, grade) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE marks = VALUES(marks), grade = VALUES(grade)
    `, [student_id, course_id, numericMarks, grade]);

    res.json({ 
      success: true, 
      message: `تم رصد الدرجة بنجاح! التقدير المحسوب تلقائياً: (${grade})` 
    });

  } catch (error) {
    console.error('Error saving student grade:', error);
    res.status(500).json({ success: false, message: 'فشل في حفظ درجة الطالب.' });
  }
});

module.exports = router;
