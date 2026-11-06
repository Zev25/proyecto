import { verificarToken } from '../seguridad/jwt.js';

const extraerBearer = (req) => {
  const cabecera = req.headers?.authorization;
  if (typeof cabecera !== 'string') return null;

  const [esquema, token] = cabecera.split(' ');
  return esquema === 'Bearer' && token ? token : null;
};

// Establece req.user solo desde un token verificado; autorizarRoles ya lee req.user.tipo primero.
const autenticar = (req, res, next) => {
  const token = extraerBearer(req);

  if (!token) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }

  try {
    req.user = verificarToken(token);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: 'Sesión expirada' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ ok: false, error: 'Token inválido' });
    }
    return next(error);
  }
};

export { autenticar };
