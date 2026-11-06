import {
  actualizarCategoriaEvaluacionProfesor,
  actualizarEvaluacionProfesor,
  actualizarPublicacionEvaluacion,
  crearEvaluacionConPreguntas,
  eliminarEvaluacion,
  listarEvaluacionesProfesor,
  obtenerEvaluacionProfesor
} from './evaluaciones.js';
import { verDetalleIntento, verIntentosProfesor } from './resultados.js';
import { cargarExcelEvaluacion } from './multerExcel.js';
import { parsearPreguntasExcel } from './evaluacionesExcel.js';
import { fechaIsoValida } from './fechaIsoValida.js';

const crearEvaluacionControlador = async (req, res) => {
  const { titulo, curso, preguntas, preguntasPorIntento, fechaFin, categoria } = req.body || {};

  if (!titulo || !curso || !Array.isArray(preguntas) || preguntas.length === 0 || preguntas.length > 50) {
    return res.status(400).json({ ok: false, error: 'Debes enviar un título, curso y entre 1 y 50 preguntas' });
  }
  if (!fechaIsoValida(fechaFin)) {
    return res.status(400).json({ ok: false, error: 'La fecha de fin debe tener formato AAAA-MM-DD y ser válida' });
  }

  try {
    const profesorUsuario = req.headers['x-user-name'];
    if (!profesorUsuario) return res.status(401).json({ ok: false, error: 'Profesor no autenticado' });
    const result = await crearEvaluacionConPreguntas({
      titulo,
      curso,
      profesorUsuario,
      preguntas,
      preguntasPorIntento,
      fechaFin: fechaFin || null,
      categoria
    });

    if (!result.ok) {
      if (result.code === 'BANCO_VACIO') return res.status(400).json({ ok: false, error: 'El banco de preguntas no puede estar vacío' });
      if (result.code === 'BANCO_SUPERA_LIMITE') return res.status(400).json({ ok: false, error: 'El banco admite como máximo 50 preguntas' });
      if (result.code === 'CANTIDAD_INTENTO_INVALIDA') return res.status(400).json({ ok: false, error: 'La cantidad de preguntas por intento debe estar entre 1 y 50' });
      if (result.code === 'CANTIDAD_INTENTO_SUPERA_BANCO') return res.status(400).json({ ok: false, error: `La cantidad por intento no puede superar las ${preguntas.length} preguntas del banco` });
      if (result.code === 'PREGUNTAS_INVALIDAS') return res.status(400).json({ ok: false, error: 'Cada pregunta debe tener enunciado, respuesta correcta y puntaje válido' });
      if (result.code === 'CATEGORIA_INVALIDA') return res.status(400).json({ ok: false, error: 'La categoría debe ser evaluación o examen final' });
    }

    return res.status(201).json({ ok: true, message: 'Evaluacion creada', evaluacionId: result.evaluacionId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo crear evaluacion', message: error.message });
  }
};

const listarEvaluacionesProfesorControlador = async (req, res) => {
  const profesorUsuario = req.headers['x-user-name'] || req.query?.usuario;
  if (!profesorUsuario) return res.status(400).json({ ok: false, error: 'Falta identificar al profesor' });

  try {
    const data = await listarEvaluacionesProfesor(profesorUsuario);
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar las evaluaciones', message: error.message });
  }
};

const publicarEvaluacionControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const profesorUsuario = req.headers['x-user-name'];
  const { publicada } = req.body || {};
  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0 || typeof publicada !== 'boolean' || !profesorUsuario) {
    return res.status(400).json({ ok: false, error: 'Datos de publicación inválidos' });
  }

  try {
    const actualizada = await actualizarPublicacionEvaluacion({ evaluacionId, profesorUsuario, publicada });
    if (!actualizada) return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
    return res.json({ ok: true, message: publicada ? 'Evaluación publicada' : 'Evaluación retirada' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo cambiar la publicación', message: error.message });
  }
};

const eliminarEvaluacionControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const profesorUsuario = req.headers['x-user-name'];
  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0 || !profesorUsuario) {
    return res.status(400).json({ ok: false, error: 'Datos de evaluación inválidos' });
  }

  try {
    const result = await eliminarEvaluacion({ evaluacionId, profesorUsuario });
    if (result.code === 'EVALUACION_NO_ENCONTRADA') return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
    if (result.code === 'EVALUACION_CON_INTENTOS') return res.status(409).json({ ok: false, error: 'No se puede eliminar una evaluación que ya tiene intentos' });
    return res.json({ ok: true, message: 'Evaluación eliminada' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar la evaluación', message: error.message });
  }
};

const categoriaEvaluacionControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const profesorUsuario = req.headers['x-user-name'] || req.body?.usuario;
  const { categoria } = req.body || {};

  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluación inválido' });
  }
  if (!profesorUsuario) return res.status(400).json({ ok: false, error: 'Falta identificar al profesor' });

  try {
    const result = await actualizarCategoriaEvaluacionProfesor({ evaluacionId, profesorUsuario, categoria });
    if (result.code === 'CATEGORIA_INVALIDA') return res.status(400).json({ ok: false, error: 'La categoría debe ser evaluación o examen final' });
    if (!result.ok) return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
    return res.json({ ok: true, message: 'Categoría actualizada' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo cambiar la categoría', message: error.message });
  }
};

const obtenerEvaluacionControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const profesorUsuario = req.headers['x-user-name'] || req.query?.usuario;
  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluación inválido' });
  }
  if (!profesorUsuario) return res.status(400).json({ ok: false, error: 'Falta identificar al profesor' });

  try {
    const data = await obtenerEvaluacionProfesor({ evaluacionId, profesorUsuario });
    if (!data) return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
    if (data.tieneIntentos) return res.status(409).json({ ok: false, error: 'No se puede editar una evaluación que ya tiene intentos' });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener la evaluación', message: error.message });
  }
};

const actualizarEvaluacionControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const { titulo, curso, preguntas, preguntasPorIntento, fechaFin, categoria } = req.body || {};
  const profesorUsuario = req.headers['x-user-name'] || req.body?.usuario;

  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluación inválido' });
  }
  if (!profesorUsuario || !titulo?.trim() || !curso || !Array.isArray(preguntas)) {
    return res.status(400).json({ ok: false, error: 'Completa título, curso y preguntas antes de guardar' });
  }
  if (!fechaIsoValida(fechaFin)) {
    return res.status(400).json({ ok: false, error: 'La fecha de fin debe tener formato AAAA-MM-DD y ser válida' });
  }

  try {
    const result = await actualizarEvaluacionProfesor({
      evaluacionId,
      profesorUsuario,
      titulo: titulo.trim(),
      curso,
      preguntas,
      preguntasPorIntento,
      fechaFin: fechaFin || null,
      categoria
    });
    if (!result.ok) {
      if (result.code === 'EVALUACION_NO_ENCONTRADA') return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
      if (result.code === 'EVALUACION_CON_INTENTOS') return res.status(409).json({ ok: false, error: 'No se puede editar una evaluación que ya tiene intentos' });
      if (result.code === 'BANCO_VACIO') return res.status(400).json({ ok: false, error: 'El banco de preguntas no puede estar vacío' });
      if (result.code === 'BANCO_SUPERA_LIMITE') return res.status(400).json({ ok: false, error: 'El banco admite como máximo 50 preguntas' });
      if (result.code === 'CANTIDAD_INTENTO_INVALIDA') return res.status(400).json({ ok: false, error: 'La cantidad de preguntas por intento debe estar entre 1 y 50' });
      if (result.code === 'CANTIDAD_INTENTO_SUPERA_BANCO') return res.status(400).json({ ok: false, error: `La cantidad por intento no puede superar las ${preguntas.length} preguntas del banco` });
      if (result.code === 'PREGUNTAS_INVALIDAS') return res.status(400).json({ ok: false, error: 'Cada pregunta debe tener enunciado, respuesta correcta y puntaje válido' });
      if (result.code === 'CATEGORIA_INVALIDA') return res.status(400).json({ ok: false, error: 'La categoría debe ser evaluación o examen final' });
    }
    return res.json({ ok: true, message: 'Evaluación actualizada', evaluacionId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar la evaluación', message: error.message });
  }
};

const importarExcelControlador = (req, res) => {
  cargarExcelEvaluacion(req, res, async (uploadError) => {
    if (uploadError) {
      const message = uploadError.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo no puede superar 2 MB'
        : uploadError.message || 'No se pudo recibir el archivo Excel';
      return res.status(400).json({ ok: false, error: message });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Debes adjuntar un archivo .xlsx en el campo archivo' });
    }

    try {
      const preguntas = await parsearPreguntasExcel(req.file.buffer);

      return res.status(200).json({
        ok: true,
        message: 'Preguntas cargadas para revisión',
        totalPreguntas: preguntas.length,
        preguntas
      });
    } catch (error) {
      const status = error.code === 'ARCHIVO_EXCEL_INVALIDO' ? 400 : 500;
      return res.status(status).json({
        ok: false,
        error: status === 400 ? error.message : 'No se pudo importar la evaluación'
      });
    }
  });
};

const intentosEvaluacionControlador = async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const profesorUsuario = req.user?.usuario || req.headers['x-user-name'];
  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluacion invalido' });
  }

  if (!profesorUsuario) {
    return res.status(401).json({ ok: false, error: 'Profesor no autenticado' });
  }

  try {
    const data = await verIntentosProfesor({ evaluacionId, profesorUsuario });
    if (!data) return res.status(404).json({ ok: false, error: 'Evaluación no encontrada' });
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener intentos', message: error.message });
  }
};

const detalleIntentoProfesorControlador = async (req, res) => {
  const intentoId = Number(req.params.intentoId);
  const profesorUsuario = req.user?.usuario || req.headers['x-user-name'];
  if (!Number.isInteger(intentoId) || intentoId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de intento invalido' });
  }

  if (!profesorUsuario) {
    return res.status(401).json({ ok: false, error: 'Profesor no autenticado' });
  }

  try {
    const detalle = await verDetalleIntento({ intentoId, profesorUsuario });
    if (!detalle) return res.status(404).json({ ok: false, error: 'Intento no encontrado' });
    return res.json({ ok: true, data: detalle });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo leer el intento', message: error.message });
  }
};

export {
  crearEvaluacionControlador,
  listarEvaluacionesProfesorControlador,
  publicarEvaluacionControlador,
  eliminarEvaluacionControlador,
  categoriaEvaluacionControlador,
  obtenerEvaluacionControlador,
  actualizarEvaluacionControlador,
  importarExcelControlador,
  intentosEvaluacionControlador,
  detalleIntentoProfesorControlador
};
