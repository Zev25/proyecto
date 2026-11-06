const ALGORITMO = 'HS256';
const SECRETO_MIN_CARACTERES = 32;

const leerConfigJwt = () => {
  const secreto = process.env.JWT_SECRET;

  if (!secreto || secreto.length < SECRETO_MIN_CARACTERES) {
    throw new Error(`JWT_SECRET debe definirse con al menos ${SECRETO_MIN_CARACTERES} caracteres`);
  }

  return {
    secreto,
    algoritmo: ALGORITMO,
    expiraEn: process.env.JWT_EXPIRES_IN || '1h',
    emisor: process.env.JWT_ISSUER || 'aula-api',
    audiencia: process.env.JWT_AUDIENCE || 'aula-web'
  };
};

export { leerConfigJwt };
