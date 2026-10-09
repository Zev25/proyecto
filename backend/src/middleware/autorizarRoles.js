const getTipoDesdeRequest = (req) => {
  if (req.user && req.user.tipo) return req.user.tipo;
  if (req.headers && req.headers['x-user-role']) return req.headers['x-user-role'];
  if (req.body && req.body.tipo) return req.body.tipo;
  if (req.query && req.query.tipo) return req.query.tipo;
  return null;
};

const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const tipoUsuario = getTipoDesdeRequest(req);

    if (!tipoUsuario) {
      return res.status(401).json({
        ok: false,
        error: 'No autenticado'
      });
    }

    if (!rolesPermitidos.includes(tipoUsuario)) {
      return res.status(403).json({
        ok: false,
        error: 'No tenés permisos para esta acción',
        requerido: rolesPermitidos,
        usuarioTipo: tipoUsuario
      });
    }

    next();
  };
};

export { autorizarRoles };
