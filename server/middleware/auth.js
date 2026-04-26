const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { id, role } = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (role !== 'guest') return res.status(403).json({ error: 'Forbidden' });
    req.guestId = id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
