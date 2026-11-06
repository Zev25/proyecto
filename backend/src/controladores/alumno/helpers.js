const construirIn = (valores) => valores.map(() => '?').join(', ');

const obtenerAlumnoIdPorUsuario = async (connection, usuario) => {
  const [rows] = await connection.query(
    "SELECT id FROM Usuario WHERE usuario = ? AND tipo = 'alumno' LIMIT 1",
    [usuario]
  );
  return rows[0]?.id || null;
};

export { construirIn, obtenerAlumnoIdPorUsuario };
