const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

// تأمين جميع المسارات للطلاب فقط
router.use(protect);
router.use(restrictTo('student'));

// دالة مساعدة لتحويل التقدير الحرفي لنقاط المعدل (على مقياس 4.0)
function getGradePoints(grade) {
  switch (grade) {
    case 'A': return 4.0;
    case 'B+': return 3.5;
    case 'B': return 3.0;
    case 'C+': return 2.5;
    case 'C': return 2.0;
    case 'D+': return 1.5;
    case 'D': return 1.0;
    case 'F': return 0.0;
    default: return 0.0;
  }
}

// ----------------------------------------------------
// 📊 جلب كشف الدرجات للطلب وحساب المعدل GPA تلقائياً
// ----------------------------------------------------
router.get('/results', async (req, res) => {
  const studentId = req.user.student_id;

  if (!studentId) {
    return res.status(400).json({ success: false, message: 'معرف الطالب غير موجود في الجلسة.' });
  }

  try {
    // 1. جلب الدرجات للمواد المسجل بها الطالب والتي تم رصد درجاتها أو لم ترصد بعد
    const [results] = await db.query(`
      SELECT c.id AS course_id, c.course_name, c.course_code, c.credits, 
             r.marks, r.grade
      FROM student_courses sc
      JOIN courses c ON sc.course_id = c.id
      LEFT JOIN results r ON r.student_id = sc.student_id AND r.course_id = sc.course_id
      WHERE sc.student_id = ?
      ORDER BY c.course_code ASC
    `, [studentId]);

    // 2. حساب المعدل التراكمي (GPA) تلقائياً
    let totalCredits = 0;
    let totalQualityPoints = 0;
    let gradedCoursesCount = 0;

    const formattedResults = results.map(row => {
      let points = 0;
      let isGraded = false;

      if (row.marks !== null && row.grade !== null) {
        points = getGradePoints(row.grade);
        totalQualityPoints += (points * row.credits);
        totalCredits += row.credits;
        gradedCoursesCount++;
        isGraded = true;
      }

      return {
        course_id: row.course_id,
        course_name: row.course_name,
        course_code: row.course_code,
        credits: row.credits,
        marks: row.marks,
        grade: row.grade,
        points: isGraded ? points : null
      };
    });

    const gpa = totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : '0.00';

    res.json({
      success: true,
      gpa: parseFloat(gpa),
      total_credits: totalCredits,
      courses_count: results.length,
      graded_count: gradedCoursesCount,
      results: formattedResults
    });

  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب كشف الدرجات والمعدل التراكمي.' });
  }
});

module.exports = router;
