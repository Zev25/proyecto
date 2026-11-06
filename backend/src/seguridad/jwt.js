import jwt from 'jsonwebtoken';
import { leerConfigJwt } from './configJwt.js';

// El payload solo lleva identidad y rol; nada sensible (contraseña, email).
const firmarToken = ({ id, usuario, tipo }) => {
  const config = leerConfigJwt();

  return jwt.sign({ usuario, tipo }, config.secreto, {
    algorithm: config.algoritmo,
    expiresIn: config.expiraEn,
    issuer: config.emisor,
    audience: config.audiencia,
    subject: String(id)
  });
};

// Fijar `algorithms` evita aceptar tokens con alg "none" o firmados con otro algoritmo.
const verificarToken = (token) => {
  const config = leerConfigJwt();

  const payload = jwt.verify(token, config.secreto, {
    algorithms: [config.algoritmo],
    issuer: config.emisor,
    audience: config.audiencia
  });

  return { id: Number(payload.sub), usuario: payload.usuario, tipo: payload.tipo };
};

export { firmarToken, verificarToken };
