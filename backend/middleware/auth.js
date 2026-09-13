import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ ok: false, error: 'Invalid or inactive user.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Insufficient permissions.' });
    }
    next();
  };
};

export const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
};
