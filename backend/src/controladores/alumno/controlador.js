import { obtenerCursosAlumnoPorUsuario } from './cursos.js';
import { obtenerResumenAlumno } from './resumen.js';
import { listarTareasAlumno } from './tareasAlumno.js';
import { listarIntentosAlumno, verDetalleIntentoAlumno } from './historial.js';
import { listarEvaluacionesDisponibles } from './evaluacionesDisponibles.js';

const evaluacionesAlumnoControlador = async (req, res) => {
  const curso = req.query?.curso || req.headers['x-user-curso'];
  const usuario = req.query?.usuario || req.headers['x-user-name'];

  if (!curso && !usuario) {
    return res.status(400).json({ ok: false, error: 'Debes enviar usuario o curso' });
  }

  try {
    const cursos = curso
      ? [curso]
      : (usuario ? await obtenerCursosAlumnoPorUsuario(usuario) : []);

    const data = await listarEvaluacionesDisponibles(cursos);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar evaluaciones', message: error.message });
  }
};

const resumenAlumnoControlador = async (req, res) => {
  const usuario = req.query?.usuario || req.headers['x-user-name'];
  const curso = req.query?.curso || req.headers['x-user-curso'];

  if (!usuario) {
    return res.status(400).json({ ok: false, error: 'Debes enviar usuario' });
  }

  try {
    const data = await obtenerResumenAlumno({ usuario, curso: curso || null });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener resumen de alumno', message: error.message });
  }
};

const tareasAlumnoControlador = async (req, res) => {
  const curso = req.query?.curso || req.headers['x-user-curso'];
  const usuario = req.query?.usuario || req.headers['x-user-name'];

  if (!curso && !usuario) {
    return res.status(400).json({ ok: false, error: 'Debes enviar usuario o curso' });
  }

  try {
    const data = await listarTareasAlumno({ usuario, curso: curso || null });
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener tareas del alumno', message: error.message });
  }
};

const intentosAlumnoControlador = async (req, res) => {
  const usuario = req.user?.usuario || req.headers['x-user-name'];

  if (!usuario) {
    return res.status(401).json({ ok: false, error: 'Alumno no autenticado' });
  }

  try {
    const data = await listarIntentosAlumno(usuario);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener intentos del alumno', message: error.message });
  }
};

const detalleIntentoAlumnoControlador = async (req, res) => {
  const intentoId = Number(req.params.intentoId);
  const usuario = req.user?.usuario || req.headers['x-user-name'];

  if (!Number.isInteger(intentoId) || intentoId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de intento invalido' });
  }

  if (!usuario) {
    return res.status(401).json({ ok: false, error: 'Alumno no autenticado' });
  }

  try {
    const data = await verDetalleIntentoAlumno({ intentoId, usuario });
    if (!data) return res.status(404).json({ ok: false, error: 'Intento no encontrado' });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener detalle del intento', message: error.message });
  }
};

export {
  evaluacionesAlumnoControlador,
  resumenAlumnoControlador,
  tareasAlumnoControlador,
  intentosAlumnoControlador,
  detalleIntentoAlumnoControlador
};
