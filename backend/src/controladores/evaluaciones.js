import { conexion } from '../db.js';

const LIMITE_BANCO_PREGUNTAS = 50;
const PREGUNTAS_POR_INTENTO_DEFAULT = 20;
const CATEGORIAS_EVALUACION = new Set(['evaluacion', 'examen_final']);

const normalizar = (txt) => String(txt ?? '').trim().toLowerCase();

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
        (titulo, curso, creado_por, max_preguntas, preguntas_por_intento, fecha_fin, categoria)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

const listarEvaluacionesDisponibles = async (cursos = null) => {
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
      `SELECT id, titulo, curso, creado_por, max_preguntas, preguntas_por_intento, categoria
       FROM Evaluacion
       ${whereCursos}
       ORDER BY id DESC`,
      cursosArray
    );

    return evaluaciones;
  } finally {
    connection.release();
  }
};

const listarEvaluacionesProfesor = async (profesorUsuario) => {
  const connection = await conexion.getConnection();

  try {
    const [evaluaciones] = await connection.query(
      `SELECT e.id, e.titulo, e.curso, e.categoria, e.preguntas_por_intento,
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

const iniciarIntentoAleatorio = async ({ evaluacionId, alumnoUsuario }) => {
  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const [alumnos] = await connection.query(
      "SELECT id, curso, estado FROM Usuario WHERE usuario = ? AND tipo = 'alumno' LIMIT 1 FOR UPDATE",
      [alumnoUsuario]
    );

    const alumno = alumnos[0];
    if (!alumno) {
      await connection.rollback();
      return { ok: false, code: 'ALUMNO_NO_ENCONTRADO' };
    }

    if (alumno.estado !== 'activo') {
      await connection.rollback();
      return { ok: false, code: 'ALUMNO_NO_ACTIVO' };
    }

    const [evaluaciones] = await connection.query(
      'SELECT id, curso, preguntas_por_intento FROM Evaluacion WHERE id = ? LIMIT 1',
      [evaluacionId]
    );

    const evaluacion = evaluaciones[0];
    if (!evaluacion) {
      await connection.rollback();
      return { ok: false, code: 'EVALUACION_NO_ENCONTRADA' };
    }

    const preguntasPorIntento = Number(evaluacion.preguntas_por_intento);
    if (!Number.isInteger(preguntasPorIntento)
      || preguntasPorIntento < 1
      || preguntasPorIntento > LIMITE_BANCO_PREGUNTAS) {
      await connection.rollback();
      return { ok: false, code: 'CONFIGURACION_INTENTO_INVALIDA' };
    }

    if (evaluacion.curso) {
      const [matriculas] = await connection.query(
        `SELECT 1
         FROM UsuarioCurso
         WHERE usuario_id = ? AND curso = ?
         UNION ALL
         SELECT 1
         FROM Usuario
         WHERE id = ? AND curso = ?
         LIMIT 1`,
        [alumno.id, evaluacion.curso, alumno.id, evaluacion.curso]
      );

      if (matriculas.length === 0) {
        await connection.rollback();
        return { ok: false, code: 'ALUMNO_NO_MATRICULADO' };
      }
    }

    const [preguntas] = await connection.query(
      `SELECT id, enunciado, opciones, tipo, puntos
       FROM Pregunta
       WHERE evaluacion_id = ?
       ORDER BY RAND()
       LIMIT ?`,
      [evaluacionId, preguntasPorIntento]
    );

    if (preguntas.length < preguntasPorIntento) {
      await connection.rollback();
      return {
        ok: false,
        code: 'BANCO_INSUFICIENTE',
        disponibles: preguntas.length,
        requeridas: preguntasPorIntento
      };
    }

    const [intentoResult] = await connection.query(
      'INSERT INTO Intento (evaluacion_id, alumno_id, alumno_usuario, nota_total) VALUES (?, ?, ?, 0)',
      [evaluacionId, alumno.id, alumnoUsuario]
    );

    const intentoId = intentoResult.insertId;
    for (const [index, pregunta] of preguntas.entries()) {
      await connection.query(
        'INSERT INTO IntentoPregunta (intento_id, pregunta_id, orden) VALUES (?, ?, ?)',
        [intentoId, pregunta.id, index + 1]
      );
    }

    await connection.commit();
    return {
      ok: true,
      intentoId,
      evaluacionId,
      totalPreguntas: preguntasPorIntento,
      preguntas: preguntas.map((pregunta, index) => ({
        id: pregunta.id,
        enunciado: pregunta.enunciado,
        opciones: pregunta.opciones ? JSON.parse(pregunta.opciones) : [],
        tipo: pregunta.tipo || 'multiple-choice',
        puntos: pregunta.puntos,
        orden: index + 1
      }))
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const responderEvaluacionAuto = async ({ intentoId, evaluacionId, alumnoUsuario, respuestas }) => {
  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const [alumnos] = await connection.query(
      "SELECT id, estado FROM Usuario WHERE usuario = ? AND tipo = 'alumno' LIMIT 1 FOR UPDATE",
      [alumnoUsuario]
    );
    const alumno = alumnos[0];

    if (!alumno) {
      await connection.rollback();
      return { ok: false, code: 'ALUMNO_NO_ENCONTRADO' };
    }

    if (alumno.estado !== 'activo') {
      await connection.rollback();
      return { ok: false, code: 'ALUMNO_NO_ACTIVO' };
    }

    const [intentos] = await connection.query(
      `SELECT id FROM Intento
       WHERE id = ? AND evaluacion_id = ? AND alumno_id = ?
       LIMIT 1 FOR UPDATE`,
      [intentoId, evaluacionId, alumno.id]
    );

    if (!intentos[0]) {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_NO_ENCONTRADO' };
    }

    const [respuestasExistentes] = await connection.query(
      'SELECT id FROM Respuesta WHERE intento_id = ? LIMIT 1',
      [intentoId]
    );

    if (respuestasExistentes[0]) {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_YA_RESPONDIDO' };
    }

    const [preguntasSeleccionadas] = await connection.query(
      `SELECT p.id, p.respuesta_correcta, p.puntos, ip.orden
       FROM IntentoPregunta ip
       JOIN Pregunta p ON p.id = ip.pregunta_id
       WHERE ip.intento_id = ? AND p.evaluacion_id = ?
       ORDER BY ip.orden ASC`,
      [intentoId, evaluacionId]
    );

    if (preguntasSeleccionadas.length === 0) {
      await connection.rollback();
      return { ok: false, code: 'SELECCION_INVALIDA' };
    }

    const respuestasBienFormadas = Array.isArray(respuestas) && respuestas.every((respuesta) => (
      respuesta !== null
      && typeof respuesta === 'object'
      && !Array.isArray(respuesta)
      && Number.isInteger(Number(respuesta.preguntaId))
      && typeof respuesta.respuesta === 'string'
    ));
    const preguntasRespondidas = respuestasBienFormadas
      ? respuestas.map((respuesta) => Number(respuesta.preguntaId))
      : [];
    const preguntasSeleccionadasSet = new Set(preguntasSeleccionadas.map((pregunta) => pregunta.id));

    if (!respuestasBienFormadas
      || preguntasRespondidas.length !== preguntasSeleccionadas.length
      || new Set(preguntasRespondidas).size !== preguntasRespondidas.length
      || preguntasRespondidas.some((id) => !preguntasSeleccionadasSet.has(id))) {
      await connection.rollback();
      return { ok: false, code: 'RESPUESTAS_INVALIDAS' };
    }

    const mapaPreguntas = new Map(preguntasSeleccionadas.map((pregunta) => [pregunta.id, pregunta]));
    const puntajeMaximo = preguntasSeleccionadas.reduce((total, pregunta) => total + Number(pregunta.puntos), 0);
    let notaTotal = 0;

    for (const respuesta of respuestas) {
      const pregunta = mapaPreguntas.get(Number(respuesta.preguntaId));
      const correcta = normalizar(respuesta.respuesta) === normalizar(pregunta.respuesta_correcta);
      const puntos = correcta ? Number(pregunta.puntos) : 0;
      notaTotal += puntos;

      await connection.query(
        'INSERT INTO Respuesta (intento_id, pregunta_id, respuesta_alumno, es_correcta, puntos_obtenidos) VALUES (?, ?, ?, ?, ?)',
        [intentoId, pregunta.id, respuesta.respuesta, correcta ? 1 : 0, puntos]
      );
    }

    await connection.query(
      'UPDATE Intento SET nota_total = ? WHERE id = ?',
      [notaTotal, intentoId]
    );

    await connection.commit();
    return {
      ok: true,
      intentoId,
      notaTotal,
      notaSobreDiez: puntajeMaximo > 0
        ? Math.round((notaTotal / puntajeMaximo) * 1000) / 100
        : 0
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

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

export {
  crearEvaluacionConPreguntas,
  listarEvaluacionesDisponibles,
  listarEvaluacionesProfesor,
  obtenerEvaluacionProfesor,
  actualizarEvaluacionProfesor,
  actualizarCategoriaEvaluacionProfesor,
  iniciarIntentoAleatorio,
  responderEvaluacionAuto,
  verIntentosProfesor,
  verDetalleIntento
};

