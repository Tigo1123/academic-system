const mysql = require('mysql2/promise');
require('dotenv').config();

// إعداد خيارات الاتصال بالسيرفر (بدون تحديد قاعدة البيانات أولاً لإنشائها إن لم تكن موجودة)
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
};

let pool;

async function initializeDatabase() {
  try {
    // 1. الاتصال بـ MySQL Server
    const connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL Server successfully.');

    // 2. إنشاء قاعدة البيانات إذا لم تكن موجودة
    const dbName = process.env.DB_NAME || 'student_results_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database "${dbName}" verified/created.`);
    await connection.end();

    // 3. إنشاء Pool متصل بقاعدة البيانات المحددة
    pool = mysql.createPool({
      ...connectionConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 4. فحص الجداول وإنشاؤها تلقائياً إذا كانت فارغة
    await verifyAndCreateTables();

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('💡 Please make sure your MySQL server is running (e.g. XAMPP / MySQL Service) and your .env credentials are correct.');
    process.exit(1);
  }
}

async function verifyAndCreateTables() {
  const connection = await pool.getConnection();
  try {
    // التحقق من وجود جدول المستخدمين كمؤشر
    const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
    
    if (tables.length === 0) {
      console.log('⏳ Tables not found. Initializing database schema and seeding data...');

      // تعريف استعلامات الجداول الأساسية
      await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('admin', 'lecturer', 'student') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE students (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE,
          name VARCHAR(150) NOT NULL,
          reg_no VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE lecturers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE courses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          course_name VARCHAR(150) NOT NULL,
          course_code VARCHAR(50) UNIQUE NOT NULL,
          credits INT DEFAULT 3
        )
      `);

      await connection.query(`
        CREATE TABLE student_courses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          course_id INT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          UNIQUE KEY unique_student_course (student_id, course_id)
        )
      `);

      await connection.query(`
        CREATE TABLE lecturer_courses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lecturer_id INT NOT NULL,
          course_id INT NOT NULL,
          FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          UNIQUE KEY unique_lecturer_course (lecturer_id, course_id)
        )
      `);

      await connection.query(`
        CREATE TABLE results (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          course_id INT NOT NULL,
          marks DECIMAL(5,2) DEFAULT NULL,
          grade VARCHAR(2) DEFAULT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          UNIQUE KEY unique_student_result (student_id, course_id)
        )
      `);

      console.log('✅ Tables created. Seeding initial data...');

      // إدخال بيانات افتراضية للتجربة (كلمة المرور المشفرة هي "password123")
      const hashedPwd = '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K';

      // Users
      await connection.query(`
        INSERT INTO users (id, username, password, role) VALUES 
        (1, 'admin', ?, 'admin'),
        (2, 'dr_ahmed', ?, 'lecturer'),
        (3, 'dr_sara', ?, 'lecturer'),
        (4, 'ali2026', ?, 'student'),
        (5, 'khalid2026', ?, 'student'),
        (6, 'mona2026', ?, 'student')
      `, [hashedPwd, hashedPwd, hashedPwd, hashedPwd, hashedPwd, hashedPwd]);

      // Lecturers
      await connection.query(`
        INSERT INTO lecturers (id, user_id, name, email, password) VALUES
        (1, 2, 'Dr. Ahmed Ali', 'ahmed@university.edu', ?),
        (2, 3, 'Dr. Sara Hassan', 'sara@university.edu', ?)
      `, [hashedPwd, hashedPwd]);

      // Students
      await connection.query(`
        INSERT INTO students (id, user_id, name, reg_no, password) VALUES
        (1, 4, 'Ali Mansour', 'REG-2026-001', ?),
        (2, 5, 'Khalid Omar', 'REG-2026-002', ?),
        (3, 6, 'Mona Yasser', 'REG-2026-003', ?)
      `, [hashedPwd, hashedPwd, hashedPwd]);

      // Courses
      await connection.query(`
        INSERT INTO courses (id, course_name, course_code, credits) VALUES
        (1, 'Database Systems', 'CS-302', 3),
        (2, 'Software Engineering', 'CS-304', 3),
        (3, 'Web Development', 'CS-308', 4),
        (4, 'Algorithms', 'CS-201', 3)
      `);

      // Lecturer Courses
      await connection.query(`
        INSERT INTO lecturer_courses (lecturer_id, course_id) VALUES
        (1, 1), (1, 2),
        (2, 3), (2, 4)
      `);

      // Student Courses
      await connection.query(`
        INSERT INTO student_courses (student_id, course_id) VALUES
        (1, 1), (1, 2), (1, 3),
        (2, 4), (2, 3),
        (3, 1), (3, 3), (3, 4)
      `);

      // Results
      await connection.query(`
        INSERT INTO results (student_id, course_id, marks, grade) VALUES
        (1, 1, 85.00, 'B+'),
        (1, 2, 92.00, 'A'),
        (2, 4, 74.00, 'C+'),
        (2, 3, 88.00, 'B+'),
        (3, 1, 95.00, 'A'),
        (3, 3, 91.00, 'A')
      `);

      console.log('🎉 Database schema and seed data loaded successfully!');
    } else {
      console.log('✅ Tables verified in database. Ready for connections.');
    }
  } catch (error) {
    console.error('❌ Table verification/creation failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// تهيئة قاعدة البيانات عند استيراد الملف
initializeDatabase();

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  getPool: () => pool
};
