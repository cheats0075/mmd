const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (req.usuario.cargo !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };
