import { conexion } from '../../db.js';
import { LIMITE_BANCO_PREGUNTAS } from '../evaluaciones/constantes.js';

const normalizar = (txt) => String(txt ?? '').trim().toLowerCase();

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
      'SELECT id, curso, preguntas_por_intento, publicada FROM Evaluacion WHERE id = ? LIMIT 1 FOR UPDATE',
      [evaluacionId]
    );

    const evaluacion = evaluaciones[0];
    if (!evaluacion) {
      await connection.rollback();
      return { ok: false, code: 'EVALUACION_NO_ENCONTRADA' };
    }

    if (!evaluacion.publicada) {
      await connection.rollback();
      return { ok: false, code: 'EVALUACION_NO_PUBLICADA' };
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
      "INSERT INTO Intento (evaluacion_id, alumno_id, alumno_usuario, nota_total, estado) VALUES (?, ?, ?, 0, 'en_progreso')",
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

const cancelarIntentoAlumno = async ({ intentoId, alumnoUsuario }) => {
  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const [alumnos] = await connection.query(
      "SELECT id FROM Usuario WHERE usuario = ? AND tipo = 'alumno' LIMIT 1 FOR UPDATE",
      [alumnoUsuario]
    );
    const alumno = alumnos[0];
    if (!alumno) {
      await connection.rollback();
      return { ok: false, code: 'ALUMNO_NO_ENCONTRADO' };
    }

    const [intentos] = await connection.query(
      'SELECT id, estado FROM Intento WHERE id = ? AND alumno_id = ? LIMIT 1 FOR UPDATE',
      [intentoId, alumno.id]
    );
    const intento = intentos[0];
    if (!intento) {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_NO_ENCONTRADO' };
    }
    if (intento.estado !== 'en_progreso') {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_NO_CANCELABLE', estado: intento.estado };
    }

    const [respuestas] = await connection.query(
      'SELECT id FROM Respuesta WHERE intento_id = ? LIMIT 1',
      [intentoId]
    );
    if (respuestas[0]) {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_CON_RESPUESTAS' };
    }

    await connection.query(
      "UPDATE Intento SET estado = 'cancelado' WHERE id = ? AND alumno_id = ?",
      [intentoId, alumno.id]
    );
    await connection.commit();
    return { ok: true, intentoId };
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
      `SELECT id, estado FROM Intento
       WHERE id = ? AND evaluacion_id = ? AND alumno_id = ?
       LIMIT 1 FOR UPDATE`,
      [intentoId, evaluacionId, alumno.id]
    );

    if (!intentos[0]) {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_NO_ENCONTRADO' };
    }
    if (intentos[0].estado === 'cancelado') {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_CANCELADO' };
    }
    if (intentos[0].estado === 'completado') {
      await connection.rollback();
      return { ok: false, code: 'INTENTO_YA_RESPONDIDO' };
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
      "UPDATE Intento SET nota_total = ?, estado = 'completado' WHERE id = ?",
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

export { iniciarIntentoAleatorio, cancelarIntentoAlumno, responderEvaluacionAuto };
