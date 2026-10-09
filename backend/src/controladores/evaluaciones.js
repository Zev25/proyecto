import { conexion } from '../db.js';

const normalizar = (txt) => (txt || '').trim().toLowerCase();

const crearEvaluacionConPreguntas = async ({ titulo, curso, profesorUsuario, preguntas }) => {
  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const [evalResult] = await connection.query(
      'INSERT INTO Evaluacion (titulo, curso, creado_por, max_preguntas) VALUES (?, ?, ?, 10)',
      [titulo, curso || null, profesorUsuario]
    );

    const evaluacionId = evalResult.insertId;

    for (const p of preguntas) {
      await connection.query(
        'INSERT INTO Pregunta (evaluacion_id, enunciado, opciones, tipo, respuesta_correcta, puntos) VALUES (?, ?, ?, ?, ?, ?)',
        [
          evaluacionId,
          p.enunciado,
          Array.isArray(p.opciones) ? JSON.stringify(p.opciones) : null,
          p.tipo || 'multiple-choice',
          p.respuestaCorrecta || '',
          Number(p.puntos || 1)
        ]
      );
    }

    await connection.commit();
    return { ok: true, evaluacionId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const listarEvaluacionesConPreguntas = async (cursos = null) => {
  const connection = await conexion.getConnection();

  try {
    if (Array.isArray(cursos) && cursos.length === 0) {
      return [];
    }

    const cursosArray = Array.isArray(cursos)
      ? cursos.filter((curso) => typeof curso === 'string' && curso.trim())
      : [];

    const whereCursos = cursosArray.length > 0
      ? `WHERE curso IN (${cursosArray.map(() => '?').join(', ')})`
      : '';

    const [evaluaciones] = await connection.query(
      `SELECT id, titulo, curso, creado_por, max_preguntas
       FROM Evaluacion
       ${whereCursos}
       ORDER BY id DESC`,
      cursosArray
    );

    const [preguntas] = await connection.query(
      'SELECT id, evaluacion_id, enunciado, opciones, tipo, respuesta_correcta, puntos FROM Pregunta ORDER BY id ASC'
    );

    const mapa = new Map();
    for (const e of evaluaciones) {
      mapa.set(e.id, { ...e, preguntas: [] });
    }

    for (const p of preguntas) {
      const item = mapa.get(p.evaluacion_id);
      if (item) {
        item.preguntas.push({
          id: p.id,
          evaluacion_id: p.evaluacion_id,
          enunciado: p.enunciado,
          opciones: p.opciones ? JSON.parse(p.opciones) : [],
          tipo: p.tipo || 'multiple-choice',
          respuesta_correcta: p.respuesta_correcta,
          puntos: p.puntos
        });
      }
    }

    return Array.from(mapa.values());
  } finally {
    connection.release();
  }
};

const responderEvaluacionAuto = async ({ evaluacionId, alumnoUsuario, respuestas }) => {
  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const [preguntasDB] = await connection.query(
      'SELECT id, respuesta_correcta, puntos FROM Pregunta WHERE evaluacion_id = ?',
      [evaluacionId]
    );

    const mapaPreg = new Map(preguntasDB.map((p) => [p.id, p]));

    const [intentoResult] = await connection.query(
      'INSERT INTO Intento (evaluacion_id, alumno_usuario, nota_total) VALUES (?, ?, 0)',
      [evaluacionId, alumnoUsuario]
    );

    const intentoId = intentoResult.insertId;
    let notaTotal = 0;

    for (const r of respuestas) {
      const p = mapaPreg.get(Number(r.preguntaId));
      if (!p) continue;

      const correcta = normalizar(r.respuesta) === normalizar(p.respuesta_correcta);
      const puntos = correcta ? Number(p.puntos) : 0;
      notaTotal += puntos;

      await connection.query(
        'INSERT INTO Respuesta (intento_id, pregunta_id, respuesta_alumno, es_correcta, puntos_obtenidos) VALUES (?, ?, ?, ?, ?)',
        [intentoId, p.id, r.respuesta || '', correcta ? 1 : 0, puntos]
      );
    }

    await connection.query(
      'UPDATE Intento SET nota_total = ? WHERE id = ?',
      [notaTotal, intentoId]
    );

    await connection.commit();
    return { intentoId, notaTotal };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const verIntentosProfesor = async (evaluacionId) => {
  const connection = await conexion.getConnection();

  try {
    const [rows] = await connection.query(
      'SELECT id, alumno_usuario, nota_total, created_at FROM Intento WHERE evaluacion_id = ? ORDER BY id DESC',
      [evaluacionId]
    );
    return rows;
  } finally {
    connection.release();
  }
};

const verDetalleIntento = async (intentoId) => {
  const connection = await conexion.getConnection();

  try {
    const [encabezadoRows] = await connection.query(
      `SELECT i.id, i.alumno_usuario, i.nota_total, i.created_at, e.titulo
       FROM Intento i
       JOIN Evaluacion e ON e.id = i.evaluacion_id
       WHERE i.id = ? LIMIT 1`,
      [intentoId]
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

export {
  crearEvaluacionConPreguntas,
  listarEvaluacionesConPreguntas,
  responderEvaluacionAuto,
  verIntentosProfesor,
  verDetalleIntento
};

