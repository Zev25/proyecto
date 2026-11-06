import { conexion } from '../../db.js';
import { LIMITE_BANCO_PREGUNTAS } from './constantes.js';

const PREGUNTAS_POR_INTENTO_DEFAULT = 20;
const CATEGORIAS_EVALUACION = new Set(['evaluacion', 'examen_final']);

const crearEvaluacionConPreguntas = async ({
  titulo,
  curso,
  profesorUsuario,
  preguntas,
  preguntasPorIntento = PREGUNTAS_POR_INTENTO_DEFAULT,
  fechaFin = null,
  categoria = 'evaluacion'
}) => {
  if (!CATEGORIAS_EVALUACION.has(categoria)) return { ok: false, code: 'CATEGORIA_INVALIDA' };

  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    return { ok: false, code: 'BANCO_VACIO' };
  }

  if (preguntas.length > LIMITE_BANCO_PREGUNTAS) {
    return { ok: false, code: 'BANCO_SUPERA_LIMITE' };
  }

  if (!Number.isInteger(Number(preguntasPorIntento))
    || Number(preguntasPorIntento) < 1
    || Number(preguntasPorIntento) > LIMITE_BANCO_PREGUNTAS) {
    return { ok: false, code: 'CANTIDAD_INTENTO_INVALIDA' };
  }
  if (Number(preguntasPorIntento) > preguntas.length) {
    return { ok: false, code: 'CANTIDAD_INTENTO_SUPERA_BANCO' };
  }

  const preguntasInvalidas = preguntas.some((pregunta) => (
    !pregunta
    || typeof pregunta.enunciado !== 'string'
    || !pregunta.enunciado.trim()
    || typeof pregunta.respuestaCorrecta !== 'string'
    || !pregunta.respuestaCorrecta.trim()
    || !Number.isFinite(Number(pregunta.puntos))
    || Number(pregunta.puntos) <= 0
  ));

  if (preguntasInvalidas) {
    return { ok: false, code: 'PREGUNTAS_INVALIDAS' };
  }

  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const [evalResult] = await connection.query(
      `INSERT INTO Evaluacion
        (titulo, curso, creado_por, max_preguntas, preguntas_por_intento, fecha_fin, categoria, publicada)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [titulo, curso || null, profesorUsuario, LIMITE_BANCO_PREGUNTAS, Number(preguntasPorIntento), fechaFin, categoria]
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

const listarEvaluacionesProfesor = async (profesorUsuario) => {
  const connection = await conexion.getConnection();

  try {
    const [evaluaciones] = await connection.query(
      `SELECT e.id, e.titulo, e.curso, e.categoria, e.preguntas_por_intento, e.publicada,
              e.created_at, DATE_FORMAT(e.fecha_fin, '%Y-%m-%d') AS fecha_fin,
              COUNT(i.id) AS intentos
       FROM Evaluacion e
       LEFT JOIN Intento i ON i.evaluacion_id = e.id
       WHERE e.creado_por = ?
       GROUP BY e.id
       ORDER BY e.created_at DESC, e.id DESC`,
      [profesorUsuario]
    );

    return evaluaciones.map((evaluacion) => ({
      ...evaluacion,
      intentos: Number(evaluacion.intentos || 0)
    }));
  } finally {
    connection.release();
  }
};

const obtenerEvaluacionProfesor = async ({ evaluacionId, profesorUsuario }) => {
  const connection = await conexion.getConnection();

  try {
    const [evaluaciones] = await connection.query(
      `SELECT id, titulo, curso, categoria, preguntas_por_intento,
              DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin
       FROM Evaluacion
       WHERE id = ? AND creado_por = ?
       LIMIT 1`,
      [evaluacionId, profesorUsuario]
    );
    if (!evaluaciones[0]) return null;

    const [preguntas] = await connection.query(
      `SELECT enunciado, opciones, tipo, respuesta_correcta AS respuestaCorrecta, puntos
       FROM Pregunta
       WHERE evaluacion_id = ?
       ORDER BY id ASC`,
      [evaluacionId]
    );

    const [intentos] = await connection.query(
      'SELECT COUNT(*) AS total FROM Intento WHERE evaluacion_id = ?',
      [evaluacionId]
    );

    return {
      ...evaluaciones[0],
      tieneIntentos: Number(intentos[0]?.total || 0) > 0,
      preguntas: preguntas.map((pregunta) => ({
        ...pregunta,
        opciones: pregunta.opciones ? JSON.parse(pregunta.opciones) : [],
        puntos: Number(pregunta.puntos)
      }))
    };
  } finally {
    connection.release();
  }
};

const actualizarEvaluacionProfesor = async ({
  evaluacionId,
  profesorUsuario,
  titulo,
  curso,
  preguntas,
  preguntasPorIntento,
  fechaFin = null,
  categoria = 'evaluacion'
}) => {
  if (!CATEGORIAS_EVALUACION.has(categoria)) return { ok: false, code: 'CATEGORIA_INVALIDA' };

  if (!Array.isArray(preguntas) || preguntas.length === 0) return { ok: false, code: 'BANCO_VACIO' };
  if (preguntas.length > LIMITE_BANCO_PREGUNTAS) return { ok: false, code: 'BANCO_SUPERA_LIMITE' };
  if (!Number.isInteger(Number(preguntasPorIntento))
    || Number(preguntasPorIntento) < 1
    || Number(preguntasPorIntento) > LIMITE_BANCO_PREGUNTAS) {
    return { ok: false, code: 'CANTIDAD_INTENTO_INVALIDA' };
  }
  if (Number(preguntasPorIntento) > preguntas.length) {
    return { ok: false, code: 'CANTIDAD_INTENTO_SUPERA_BANCO' };
  }

  const preguntasInvalidas = preguntas.some((pregunta) => (
    !pregunta
    || typeof pregunta.enunciado !== 'string'
    || !pregunta.enunciado.trim()
    || typeof pregunta.respuestaCorrecta !== 'string'
    || !pregunta.respuestaCorrecta.trim()
    || !Number.isFinite(Number(pregunta.puntos))
    || Number(pregunta.puntos) <= 0
  ));
  if (preguntasInvalidas) return { ok: false, code: 'PREGUNTAS_INVALIDAS' };

  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const [evaluaciones] = await connection.query(
      'SELECT id FROM Evaluacion WHERE id = ? AND creado_por = ? LIMIT 1 FOR UPDATE',
      [evaluacionId, profesorUsuario]
    );
    if (!evaluaciones[0]) {
      await connection.rollback();
      return { ok: false, code: 'EVALUACION_NO_ENCONTRADA' };
    }

    const [intentos] = await connection.query(
      'SELECT id FROM Intento WHERE evaluacion_id = ? LIMIT 1 FOR UPDATE',
      [evaluacionId]
    );
    if (intentos[0]) {
      await connection.rollback();
      return { ok: false, code: 'EVALUACION_CON_INTENTOS' };
    }

    await connection.query(
      `UPDATE Evaluacion
        SET titulo = ?, curso = ?, preguntas_por_intento = ?, fecha_fin = ?, categoria = ?
       WHERE id = ? AND creado_por = ?`,
            [titulo, curso || null, Number(preguntasPorIntento), fechaFin, categoria, evaluacionId, profesorUsuario]
    );
    await connection.query('DELETE FROM Pregunta WHERE evaluacion_id = ?', [evaluacionId]);

    for (const pregunta of preguntas) {
      await connection.query(
        'INSERT INTO Pregunta (evaluacion_id, enunciado, opciones, tipo, respuesta_correcta, puntos) VALUES (?, ?, ?, ?, ?, ?)',
        [
          evaluacionId,
          pregunta.enunciado,
          Array.isArray(pregunta.opciones) ? JSON.stringify(pregunta.opciones) : null,
          pregunta.tipo || 'multiple-choice',
          pregunta.respuestaCorrecta,
          Number(pregunta.puntos)
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

const actualizarCategoriaEvaluacionProfesor = async ({ evaluacionId, profesorUsuario, categoria }) => {
  if (!CATEGORIAS_EVALUACION.has(categoria)) return { ok: false, code: 'CATEGORIA_INVALIDA' };

  const connection = await conexion.getConnection();

  try {
    const [evaluaciones] = await connection.query(
      'SELECT id FROM Evaluacion WHERE id = ? AND creado_por = ? LIMIT 1',
      [evaluacionId, profesorUsuario]
    );
    if (!evaluaciones[0]) return { ok: false, code: 'EVALUACION_NO_ENCONTRADA' };

    await connection.query(
      'UPDATE Evaluacion SET categoria = ? WHERE id = ? AND creado_por = ?',
      [categoria, evaluacionId, profesorUsuario]
    );
    return { ok: true };
  } finally {
    connection.release();
  }
};

const actualizarPublicacionEvaluacion = async ({ evaluacionId, profesorUsuario, publicada }) => {
  const connection = await conexion.getConnection();

  try {
    const [result] = await connection.query(
      'UPDATE Evaluacion SET publicada = ? WHERE id = ? AND creado_por = ?',
      [publicada ? 1 : 0, evaluacionId, profesorUsuario]
    );
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
};

const eliminarEvaluacion = async ({ evaluacionId, profesorUsuario }) => {
  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();
    const [evaluaciones] = await connection.query(
      'SELECT id FROM Evaluacion WHERE id = ? AND creado_por = ? LIMIT 1 FOR UPDATE',
      [evaluacionId, profesorUsuario]
    );
    if (!evaluaciones.length) {
      await connection.rollback();
      return { ok: false, code: 'EVALUACION_NO_ENCONTRADA' };
    }

    const [intentos] = await connection.query(
      'SELECT COUNT(*) AS total FROM Intento WHERE evaluacion_id = ?',
      [evaluacionId]
    );
    if (Number(intentos[0]?.total || 0) > 0) {
      await connection.rollback();
      return { ok: false, code: 'EVALUACION_CON_INTENTOS' };
    }

    await connection.query('DELETE FROM Evaluacion WHERE id = ?', [evaluacionId]);
    await connection.commit();
    return { ok: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export {
  actualizarPublicacionEvaluacion,
  crearEvaluacionConPreguntas,
  eliminarEvaluacion,
  listarEvaluacionesProfesor,
  obtenerEvaluacionProfesor,
  actualizarEvaluacionProfesor,
  actualizarCategoriaEvaluacionProfesor
};
