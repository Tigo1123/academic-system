/* ========================================================
   Electronic Student Results System - Main Application Logic
   منطق النظام الرئيسي وإدارة التخزين ونقاط الاتصال للواجهة
   ======================================================== */

// العنوان الأساسي لـ API الخاص بالـ Backend
const API_BASE_URL = window.location.origin; // لتسهيل تشغيل المشروع محلياً أو على أي خادم

/**
 * دالة مساعدة لعمل طلبات API مع إرسال توكن المصادقة تلقائياً
 * @param {string} endpoint - مسار الـ API (مثال: '/api/admin/students')
 * @param {object} options - الخيارات الممررة للطلب (الطريقة، الجسم، إلخ)
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('jwt_token');
  
  // تجهيز الترويسات الافتراضية
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // إلحاق التوكن إذا كان متوفراً في التخزين المحلي
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    // التعامل مع انتهاء صلاحية الجلسة أو عدم الصلاحية (401)
    if (response.status === 401) {
      showToast('انتهت صلاحية جلسة العمل الخاصة بك. يرجى تسجيل الدخول مجدداً.', 'danger');
      logout();
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    showToast('خطأ في الاتصال بالخادم. يرجى التأكد من تشغيل الـ Server.', 'danger');
    return null;
  }
}

/**
 * التحقق من صلاحية الجلسة وتوجيه المستخدم للصفحة الصحيحة
 * @param {Array<string>} allowedRoles - الأدوار المسموح لها بالبقاء في الصفحة الحالية
 */
function checkAuth(allowedRoles = []) {
  const token = localStorage.getItem('jwt_token');
  const user = JSON.parse(localStorage.getItem('user'));

  // إذا لم يكن هناك توكن ومحاولة الدخول لصفحة محمية
  if (!token || !user) {
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
    return;
  }

  // إذا كان المستخدم مسجل دخول ويحاول فتح صفحة تسجيل الدخول
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    redirectToDashboard(user.role);
    return;
  }

  // التحقق من أن دور المستخدم مسموح له بدخول الصفحة الحالية
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    showToast('غير مصرح لك بدخول هذه الصفحة.', 'warning');
    redirectToDashboard(user.role);
  }

  // تحديث بيانات بطاقة الملف الشخصي بالواجهة إن وجدت
  updateProfileBadge(user);
}

/**
 * توجيه المستخدم لوحة التحكم الخاصة بدوره الأكاديمي
 * @param {string} role - دور المستخدم (admin | lecturer | student)
 */
function redirectToDashboard(role) {
  if (role === 'admin') {
    window.location.href = 'admin.html';
  } else if (role === 'lecturer') {
    window.location.href = 'lecturer.html';
  } else if (role === 'student') {
    window.location.href = 'student.html';
  }
}

/**
 * تحديث معلومات المستخدم في الهيدر العلوي
 */
function updateProfileBadge(user) {
  const nameEl = document.getElementById('header-user-name');
  const roleEl = document.getElementById('header-user-role');
  const avatarEl = document.getElementById('header-user-avatar');

  if (nameEl) nameEl.textContent = user.name || user.username;
  if (roleEl) {
    let roleText = 'طالب';
    if (user.role === 'admin') roleText = 'مسؤول نظام';
    if (user.role === 'lecturer') roleText = 'محاضر';
    roleEl.textContent = roleText;
  }
  
  if (avatarEl) {
    const initials = (user.name || user.username).substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

/**
 * تسجيل الخروج وتنظيف التخزين المحلي
 */
function logout() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

/**
 * عرض تنبيه منبثق (Toast Notification) أنيق وسلس بالواجهة
 * @param {string} message - نص الرسالة للتنبيه
 * @param {string} type - نوع التنبيه (success | danger | warning)
 */
function showToast(message, type = 'success') {
  // البحث عن الحاوية أو إنشاؤها إن لم تكن موجودة
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // إنشاء عنصر التنبيه
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  // إزالة التنبيه بعد 4 ثوانٍ مع حركة تلاشي
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.4s ease-in-out forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

// إضافة حركة التلاشي للخروج بـ CSS ديناميكياً
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-50px); }
}
`;
document.head.appendChild(styleSheet);
