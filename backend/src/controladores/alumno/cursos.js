import { conexion } from '../../db.js';

const obtenerCursosAlumnoPorUsuarioConn = async (connection, usuario) => {
  const [usuarioRows] = await connection.query(
    'SELECT id, curso FROM Usuario WHERE usuario = ? AND tipo = \'alumno\' LIMIT 1',
    [usuario]
  );

  const usuarioRow = usuarioRows[0];
  if (!usuarioRow) return [];

  const [cursosRows] = await connection.query(
    'SELECT curso FROM UsuarioCurso WHERE usuario_id = ? ORDER BY curso ASC',
    [usuarioRow.id]
  );

  const cursos = cursosRows.map((row) => row.curso).filter(Boolean);
  if (cursos.length > 0) return cursos;

  return usuarioRow.curso ? [usuarioRow.curso] : [];
};

const obtenerCursosAlumnoPorUsuario = async (usuario) => {
  const connection = await conexion.getConnection();

  try {
    return await obtenerCursosAlumnoPorUsuarioConn(connection, usuario);
  } finally {
    connection.release();
  }
};

export { obtenerCursosAlumnoPorUsuarioConn, obtenerCursosAlumnoPorUsuario };
