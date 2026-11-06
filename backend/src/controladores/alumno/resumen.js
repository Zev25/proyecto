import { conexion } from '../../db.js';
import { obtenerCursosAlumnoPorUsuarioConn } from './cursos.js';
import { construirIn } from './helpers.js';

const obtenerResumenAlumno = async ({ usuario, curso = null }) => {
  const connection = await conexion.getConnection();

  try {
    const cursosAsignados = await obtenerCursosAlumnoPorUsuarioConn(connection, usuario);
    const cursosObjetivo = curso ? [curso] : cursosAsignados;

    if (cursosObjetivo.length === 0) {
      const [[intentosCountSinCurso]] = await connection.query(
        'SELECT COUNT(*) AS total FROM Intento WHERE alumno_usuario = ?',
        [usuario]
      );

      const [[notaPromedioSinCurso]] = await connection.query(
        'SELECT COALESCE(AVG(nota_total), 0) AS promedio FROM Intento WHERE alumno_usuario = ?',
        [usuario]
      );

      return {
        cursos: [],
        tareasDisponibles: 0,
        evaluacionesDisponibles: 0,
        intentosRealizados: Number(intentosCountSinCurso.total || 0),
        notaPromedio: Number(notaPromedioSinCurso.promedio || 0)
      };
    }

    const inCursos = construirIn(cursosObjetivo);

    const [[tareasCount]] = await connection.query(
      `SELECT COUNT(*) AS total FROM Tarea WHERE curso IN (${inCursos})`,
      cursosObjetivo
    );

    const [[evaluacionesCount]] = await connection.query(
      `SELECT COUNT(*) AS total FROM Evaluacion WHERE curso IN (${inCursos})`,
      cursosObjetivo
    );

    const [[intentosCount]] = await connection.query(
      'SELECT COUNT(*) AS total FROM Intento WHERE alumno_usuario = ?',
      [usuario]
    );

    const [[notaPromedio]] = await connection.query(
      'SELECT COALESCE(AVG(nota_total), 0) AS promedio FROM Intento WHERE alumno_usuario = ?',
      [usuario]
    );

    return {
      cursos: cursosObjetivo,
      tareasDisponibles: Number(tareasCount.total || 0),
      evaluacionesDisponibles: Number(evaluacionesCount.total || 0),
      intentosRealizados: Number(intentosCount.total || 0),
      notaPromedio: Number(notaPromedio.promedio || 0)
    };
  } finally {
    connection.release();
  }
};

export { obtenerResumenAlumno };
