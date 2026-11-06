import { cancelarIntentoAlumno, iniciarIntentoAleatorio, responderEvaluacionAuto } from './intentos.js';

const iniciarIntentoControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const alumnoUsuario = req.user?.usuario || req.headers['x-user-name'];

  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluación inválido' });
  }

  if (!alumnoUsuario) {
    return res.status(401).json({ ok: false, error: 'Alumno no autenticado' });
  }

  try {
    const result = await iniciarIntentoAleatorio({ evaluacionId, alumnoUsuario });

    if (!result.ok) {
      if (result.code === 'ALUMNO_NO_ENCONTRADO') return res.status(404).json({ ok: false, error: 'Alumno no encontrado' });
      if (result.code === 'EVALUACION_NO_ENCONTRADA') return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
      if (result.code === 'EVALUACION_NO_PUBLICADA') return res.status(404).json({ ok: false, error: 'Evaluación no publicada' });
      if (result.code === 'ALUMNO_NO_ACTIVO') return res.status(403).json({ ok: false, error: 'Alumno inactivo o bloqueado' });
      if (result.code === 'ALUMNO_NO_MATRICULADO') return res.status(403).json({ ok: false, error: 'El alumno no está inscrito en este curso' });
      if (result.code === 'BANCO_INSUFICIENTE') return res.status(409).json({ ok: false, error: 'La evaluación no tiene suficientes preguntas', disponibles: result.disponibles, requeridas: result.requeridas });
      return res.status(400).json({ ok: false, error: 'No se pudo iniciar el intento', code: result.code });
    }

    return res.status(201).json({ ok: true, message: 'Intento iniciado', data: result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo iniciar el intento', message: error.message });
  }
};

const cancelarIntentoControlador = async (req, res) => {
  const intentoId = Number(req.params.intentoId);
  const alumnoUsuario = req.user?.usuario || req.headers['x-user-name'];

  if (!Number.isInteger(intentoId) || intentoId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de intento inválido' });
  }
  if (!alumnoUsuario) {
    return res.status(401).json({ ok: false, error: 'Alumno no autenticado' });
  }

  try {
    const result = await cancelarIntentoAlumno({ intentoId, alumnoUsuario });
    if (!result.ok) {
      if (result.code === 'ALUMNO_NO_ENCONTRADO' || result.code === 'INTENTO_NO_ENCONTRADO') {
        return res.status(404).json({ ok: false, error: 'Intento no encontrado' });
      }
      if (result.code === 'INTENTO_NO_CANCELABLE' || result.code === 'INTENTO_CON_RESPUESTAS') {
        return res.status(409).json({ ok: false, error: 'El intento ya no se puede cancelar' });
      }
      return res.status(400).json({ ok: false, error: 'No se pudo cancelar el intento', code: result.code });
    }
    return res.json({ ok: true, message: 'Intento cancelado', intentoId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo cancelar el intento', message: error.message });
  }
};

const responderEvaluacionControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const { intentoId, respuestas } = req.body || {};
  const alumnoUsuario = req.user?.usuario || req.headers['x-user-name'];

  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluacion invalido' });
  }

  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    return res.status(400).json({ ok: false, error: 'Debes enviar respuestas' });
  }

  if (!Number.isInteger(Number(intentoId)) || Number(intentoId) <= 0) {
    return res.status(400).json({ ok: false, error: 'Debes enviar el ID del intento iniciado' });
  }

  if (!alumnoUsuario) {
    return res.status(401).json({ ok: false, error: 'Alumno no autenticado' });
  }

  try {
    const result = await responderEvaluacionAuto({
      intentoId: Number(intentoId),
      evaluacionId,
      alumnoUsuario,
      respuestas
    });

    if (!result.ok) {
      if (result.code === 'ALUMNO_NO_ENCONTRADO') return res.status(404).json({ ok: false, error: 'Alumno no encontrado' });
      if (result.code === 'EVALUACION_NO_ENCONTRADA') return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
      if (result.code === 'ALUMNO_NO_ACTIVO') return res.status(403).json({ ok: false, error: 'Alumno inactivo o bloqueado' });
      if (result.code === 'ALUMNO_NO_MATRICULADO') return res.status(403).json({ ok: false, error: 'El alumno no está inscrito en este curso' });
      if (result.code === 'INTENTO_NO_ENCONTRADO') return res.status(404).json({ ok: false, error: 'Intento no encontrado' });
      if (result.code === 'INTENTO_YA_RESPONDIDO') return res.status(409).json({ ok: false, error: 'El intento ya fue respondido' });
      if (result.code === 'SELECCION_INVALIDA') return res.status(409).json({ ok: false, error: 'La selección guardada del intento es inválida' });
      if (result.code === 'RESPUESTAS_INVALIDAS') return res.status(400).json({ ok: false, error: 'Las respuestas incluyen preguntas inválidas o repetidas' });
      return res.status(400).json({ ok: false, error: 'No se pudo registrar el intento', code: result.code });
    }

    return res.json({
      ok: true,
      message: 'Examen respondido y autoevaluado',
      intentoId: result.intentoId,
      notaTotal: result.notaTotal
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo registrar el intento', message: error.message });
  }
};

export { iniciarIntentoControlador, cancelarIntentoControlador, responderEvaluacionControlador };
