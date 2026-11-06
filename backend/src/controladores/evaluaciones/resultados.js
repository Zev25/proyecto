import { conexion } from '../../db.js';

const verIntentosProfesor = async ({ evaluacionId, profesorUsuario }) => {
  const connection = await conexion.getConnection();

  try {
    const [evaluaciones] = await connection.query(
      'SELECT id FROM Evaluacion WHERE id = ? AND creado_por = ? LIMIT 1',
      [evaluacionId, profesorUsuario]
    );

    if (!evaluaciones[0]) return null;

    const [rows] = await connection.query(
      `SELECT i.id, i.alumno_usuario, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido,
              i.nota_total, i.created_at
       FROM Intento i
       LEFT JOIN Usuario u ON u.usuario = i.alumno_usuario
       WHERE i.evaluacion_id = ?
       ORDER BY i.id DESC`,
      [evaluacionId]
    );
    return rows;
  } finally {
    connection.release();
  }
};

const verDetalleIntento = async ({ intentoId, profesorUsuario }) => {
  const connection = await conexion.getConnection();

  try {
    const [encabezadoRows] = await connection.query(
      `SELECT i.id, i.alumno_usuario, i.nota_total, i.created_at, e.titulo
       FROM Intento i
       JOIN Evaluacion e ON e.id = i.evaluacion_id
       WHERE i.id = ? AND e.creado_por = ?
       LIMIT 1`,
      [intentoId, profesorUsuario]
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

    return { ...encabezadoRows[0], respuestas: respuestasRows };
  } finally {
    connection.release();
  }
};

export { verIntentosProfesor, verDetalleIntento };
