-- ==========================================
-- Electronic Student Results System - Schema
-- مشروع تخرج: نظام النتائج الإلكترونية للطلاب
-- ==========================================

-- 1. إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS student_results_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_results_db;

-- 2. جدول المستخدمين (لحفظ الحسابات والصلاحيات)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'lecturer', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. جدول الطلاب
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE, -- مفتاح خارجي يربط بجدول المستخدمين لتسجيل الدخول
    name VARCHAR(150) NOT NULL,
    reg_no VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. جدول المحاضرين
CREATE TABLE IF NOT EXISTS lecturers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE, -- مفتاح خارجي يربط بجدول المستخدمين
    name VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. جدول المواد الدراسية (Courses)
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    credits INT DEFAULT 3 -- عدد الساعات المعتمدة للمادة (مهم لحساب المعدل GPA)
);

-- 6. جدول ربط الطلاب بالمواد (التسجيل الأكاديمي)
CREATE TABLE IF NOT EXISTS student_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_course (student_id, course_id)
);

-- 7. جدول ربط المحاضرين بالمواد (إسناد المواد للمحاضرين)
CREATE TABLE IF NOT EXISTS lecturer_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id INT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lecturer_course (lecturer_id, course_id)
);

-- 8. جدول النتائج والدرجات
CREATE TABLE IF NOT EXISTS results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    marks DECIMAL(5,2) DEFAULT NULL, -- درجة الطالب من 100
    grade VARCHAR(2) DEFAULT NULL,    -- التقدير (A, B+, B, C+, C, D+, D, F)
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_result (student_id, course_id)
);

-- =========================================================================
-- إدخال بيانات تجريبية (Seed Data)
-- ملاحظة: كلمات المرور المشفرة أدناه هي للتجربة وهي مكافئة لـ "password123"
-- =========================================================================

-- 1. إضافة مستخدمين (Users)
-- المسؤول (Admin): admin
INSERT INTO users (id, username, password, role) VALUES 
(1, 'admin', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- المحاضرين (Lecturers): dr_ahmed, dr_sara
INSERT INTO users (id, username, password, role) VALUES 
(2, 'dr_ahmed', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K', 'lecturer'),
(3, 'dr_sara', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K', 'lecturer')
ON DUPLICATE KEY UPDATE id=id;

-- الطلاب (Students): ali2026, khalid2026, mona2026
INSERT INTO users (id, username, password, role) VALUES 
(4, 'ali2026', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K', 'student'),
(5, 'khalid2026', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K', 'student'),
(6, 'mona2026', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K', 'student')
ON DUPLICATE KEY UPDATE id=id;

-- 2. ربط المحاضرين ببياناتهم التفصيلية
INSERT INTO lecturers (id, user_id, name, email, password) VALUES
(1, 2, 'Dr. Ahmed Ali', 'ahmed@university.edu', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K'),
(2, 3, 'Dr. Sara Hassan', 'sara@university.edu', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K')
ON DUPLICATE KEY UPDATE id=id;

-- 3. ربط الطلاب ببياناتهم التفصيلية
INSERT INTO students (id, user_id, name, reg_no, password) VALUES
(1, 4, 'Ali Mansour', 'REG-2026-001', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K'),
(2, 5, 'Khalid Omar', 'REG-2026-002', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K'),
(3, 6, 'Mona Yasser', 'REG-2026-003', '$2a$10$QJNhILNCfYSWOzTSUaFsLOH7ELBJKzSdp.5QEdPWgh4qcpe2qMb1K')
ON DUPLICATE KEY UPDATE id=id;

-- 4. إضافة بعض المواد الدراسية (Courses)
INSERT INTO courses (id, course_name, course_code, credits) VALUES
(1, 'Database Systems', 'CS-302', 3),
(2, 'Software Engineering', 'CS-304', 3),
(3, 'Web Development', 'CS-308', 4),
(4, 'Algorithms', 'CS-201', 3)
ON DUPLICATE KEY UPDATE id=id;

-- 5. إسناد المواد للمحاضرين
-- د. أحمد يدرس قواعد البيانات وهندسة البرمجيات
-- د. سارة تدرس تطوير الويب والخوارزميات
INSERT INTO lecturer_courses (lecturer_id, course_id) VALUES
(1, 1),
(1, 2),
(2, 3),
(2, 4)
ON DUPLICATE KEY UPDATE id=id;

-- 6. تسجيل المواد للطلاب
-- علي مسجل في: قواعد البيانات، هندسة البرمجيات، وتطوير الويب
-- خالد مسجل في: الخوارزميات، وتطوير الويب
-- منى مسجلة في: قواعد البيانات، تطوير الويب، والخوارزميات
INSERT INTO student_courses (student_id, course_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 4), (2, 3),
(3, 1), (3, 3), (3, 4)
ON DUPLICATE KEY UPDATE id=id;

-- 7. رصد بعض الدرجات للطلاب لتسهيل العرض
-- علي: Database Systems = 85 (B+), Software Engineering = 92 (A)
-- خالد: Algorithms = 74 (C+), Web Development = 88 (B+)
-- منى: Database Systems = 95 (A), Web Development = 91 (A)
INSERT INTO results (student_id, course_id, marks, grade) VALUES
(1, 1, 85.00, 'B+'),
(1, 2, 92.00, 'A'),
(2, 4, 74.00, 'C+'),
(2, 3, 88.00, 'B+'),
(3, 1, 95.00, 'A'),
(3, 3, 91.00, 'A')
ON DUPLICATE KEY UPDATE id=id;
