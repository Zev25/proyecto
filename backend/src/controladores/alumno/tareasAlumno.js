import { conexion } from '../../db.js';
import { obtenerCursosAlumnoPorUsuarioConn } from './cursos.js';
import { construirIn } from './helpers.js';

const listarTareasAlumno = async ({ usuario, curso = null }) => {
  const connection = await conexion.getConnection();

  try {
    const cursosObjetivo = curso ? [curso] : await obtenerCursosAlumnoPorUsuarioConn(connection, usuario);
    if (cursosObjetivo.length === 0) return [];

    const inCursos = construirIn(cursosObjetivo);
    const [rows] = await connection.query(
      `SELECT id, titulo, descripcion, curso, profesor_usuario, fecha_vencimiento, creada_en
       FROM Tarea
      WHERE curso IN (${inCursos}) AND publicada = 1
       ORDER BY id DESC`,
      cursosObjetivo
    );
    return rows;
  } finally {
    connection.release();
  }
};

export { listarTareasAlumno };
