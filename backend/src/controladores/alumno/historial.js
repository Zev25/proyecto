import { conexion } from '../../db.js';
import { obtenerAlumnoIdPorUsuario } from './helpers.js';

const listarIntentosAlumno = async (usuario) => {
  const connection = await conexion.getConnection();

  try {
    const alumnoId = await obtenerAlumnoIdPorUsuario(connection, usuario);
    if (!alumnoId) return [];

    const [rows] = await connection.query(
      `SELECT i.id, i.evaluacion_id, i.nota_total, i.created_at, i.estado, e.titulo, e.curso, e.categoria,
              (SELECT SUM(p.puntos)
               FROM IntentoPregunta ip
               JOIN Pregunta p ON p.id = ip.pregunta_id
               WHERE ip.intento_id = i.id) AS puntaje_maximo,
              (SELECT COUNT(*) FROM IntentoPregunta ip WHERE ip.intento_id = i.id) AS total_preguntas,
              (SELECT COUNT(*) FROM Respuesta r WHERE r.intento_id = i.id) AS respuestas_registradas
       FROM Intento i
       JOIN Evaluacion e ON e.id = i.evaluacion_id
       WHERE i.alumno_id = ?
       ORDER BY i.id DESC`,
      [alumnoId]
    );
    return rows.map((row) => {
      const puntajeMaximo = Number(row.puntaje_maximo || 0);
      const totalPreguntas = Number(row.total_preguntas || 0);
      const respuestasRegistradas = Number(row.respuestas_registradas || 0);
      const estado = row.estado || (totalPreguntas > 0 && respuestasRegistradas === totalPreguntas ? 'completado' : 'cancelado');
      const completado = estado === 'completado';

      return {
        ...row,
        estado,
        completado,
        nota_sobre_10: completado && puntajeMaximo > 0
          ? Math.round((Number(row.nota_total) / puntajeMaximo) * 1000) / 100
          : null
      };
    });
  } finally {
    connection.release();
  }
};

const verDetalleIntentoAlumno = async ({ intentoId, usuario }) => {
  const connection = await conexion.getConnection();

  try {
    const alumnoId = await obtenerAlumnoIdPorUsuario(connection, usuario);
    if (!alumnoId) return null;

    const [encabezadoRows] = await connection.query(
      `SELECT i.id, i.alumno_usuario, i.nota_total, i.created_at, e.titulo, e.curso
       FROM Intento i
       JOIN Evaluacion e ON e.id = i.evaluacion_id
      WHERE i.id = ? AND i.alumno_id = ?
       LIMIT 1`,
          [intentoId, alumnoId]
    );

    if (!encabezadoRows[0]) return null;

    const [respuestasRows] = await connection.query(
      `SELECT r.pregunta_id, p.enunciado, r.respuesta_alumno, r.es_correcta, r.puntos_obtenidos
       FROM Respuesta r
       JOIN Pregunta p ON p.id = r.pregunta_id
       WHERE r.intento_id = ?
       ORDER BY r.id ASC`,
      [intentoId]
    );

    return {
      ...encabezadoRows[0],
      respuestas: respuestasRows
    };
  } finally {
    connection.release();
  }
};

export { listarIntentosAlumno, verDetalleIntentoAlumno };
