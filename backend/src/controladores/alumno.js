import { conexion } from '../db.js';

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

const construirIn = (valores) => valores.map(() => '?').join(', ');

const obtenerAlumnoIdPorUsuario = async (connection, usuario) => {
  const [rows] = await connection.query(
    "SELECT id FROM Usuario WHERE usuario = ? AND tipo = 'alumno' LIMIT 1",
    [usuario]
  );
  return rows[0]?.id || null;
};

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

const listarTareasAlumno = async ({ usuario, curso = null }) => {
  const connection = await conexion.getConnection();

  try {
    const cursosObjetivo = curso ? [curso] : await obtenerCursosAlumnoPorUsuarioConn(connection, usuario);
    if (cursosObjetivo.length === 0) return [];

    const inCursos = construirIn(cursosObjetivo);
    const [rows] = await connection.query(
      `SELECT id, titulo, descripcion, curso, profesor_usuario, fecha_vencimiento, creada_en
       FROM Tarea
       WHERE curso IN (${inCursos})
       ORDER BY id DESC`,
      cursosObjetivo
    );
    return rows;
  } finally {
    connection.release();
  }
};

const listarIntentosAlumno = async (usuario) => {
  const connection = await conexion.getConnection();

  try {
    const alumnoId = await obtenerAlumnoIdPorUsuario(connection, usuario);
    if (!alumnoId) return [];

    const [rows] = await connection.query(
      `SELECT i.id, i.evaluacion_id, i.nota_total, i.created_at, e.titulo, e.curso, e.categoria,
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
      const completado = totalPreguntas > 0 && respuestasRegistradas === totalPreguntas;

      return {
        ...row,
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

export {
  obtenerCursosAlumnoPorUsuario,
  obtenerResumenAlumno,
  listarTareasAlumno,
  listarIntentosAlumno,
  verDetalleIntentoAlumno
};
