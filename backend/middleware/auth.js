const jwt = require('jsonwebtoken');

// 1. برمجية التحقق من تسجيل الدخول (Authentication Middleware)
const protect = (req, res, next) => {
  let token;

  // التحقق من وجود التوكن في الترويسة (Header)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // إذا لم يتم العثور على التوكن
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح بالدخول. يرجى تسجيل الدخول أولاً.'
    });
  }

  try {
    // التحقق من صحة التوكن وفكه
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // إضافة بيانات المستخدم إلى الطلب (request) ليتسنى استخدامها في المسارات اللاحقة
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'جلسة العمل انتهت أو التوكن غير صالح. يرجى تسجيل الدخول مجدداً.'
    });
  }
};

// 2. برمجية التحقق من الصلاحيات (Authorization Middleware)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // التأكد من أن دور المستخدم الحالي يطابق أحد الأدوار المسموح لها بالدخول
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك الصلاحية للوصول إلى هذا الجزء من النظام.'
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};
