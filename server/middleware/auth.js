const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'prajakeeya_secret_2026_governance';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, dept_id: user.dept_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authenticate, authorize, sign };
