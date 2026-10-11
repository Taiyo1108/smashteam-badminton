const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.', code: 'NO_TOKEN' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 
        code: 'TOKEN_EXPIRED' 
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Mã xác thực không hợp lệ.', 
        code: 'INVALID_TOKEN' 
      });
    }
    return res.status(401).json({ 
      error: 'Xác thực phiên làm việc không thành công.', 
      code: 'AUTH_ERROR' 
    });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Requires admin privileges.', code: 'FORBIDDEN_ROLE' });
  }
};

module.exports = { authenticateToken, isAdmin };
