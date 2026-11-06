import {
  actualizarPublicacionTarea,
  crearTarea,
  eliminarTarea,
  listarTareasPorCurso,
  listarTareasPorProfesor
} from './tareas.js';

const crearTareaControlador = async (req, res) => {
  const { titulo, descripcion, curso, fechaVencimiento } = req.body || {};
  const profesorUsuario = req.headers['x-user-name'];

  if (!titulo || !curso || !profesorUsuario) {
    return res.status(400).json({ ok: false, error: 'Faltan datos para crear la tarea' });
  }

  try {
    const result = await crearTarea({ titulo, descripcion: descripcion || '', curso, profesorUsuario, fechaVencimiento });
    return res.status(201).json({ ok: true, message: 'Tarea creada', tareaId: result.insertId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo crear la tarea', message: error.message });
  }
};

const listarTareasProfesorControlador = async (req, res) => {
  const profesorUsuario = req.query?.usuario || req.headers['x-user-name'];

  if (!profesorUsuario) {
    return res.status(400).json({ ok: false, error: 'Usuario profesor requerido' });
  }

  try {
    const data = await listarTareasPorProfesor(profesorUsuario);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener tareas del profesor', message: error.message });
  }
};

const publicarTareaControlador = async (req, res) => {
  const tareaId = Number(req.params.id);
  const profesorUsuario = req.headers['x-user-name'];
  const { publicada } = req.body || {};
  if (!Number.isInteger(tareaId) || tareaId <= 0 || typeof publicada !== 'boolean' || !profesorUsuario) {
    return res.status(400).json({ ok: false, error: 'Datos de publicación inválidos' });
  }

  try {
    const actualizada = await actualizarPublicacionTarea({ tareaId, profesorUsuario, publicada });
    if (!actualizada) return res.status(404).json({ ok: false, error: 'Tarea no encontrada' });
    return res.json({ ok: true, message: publicada ? 'Tarea publicada' : 'Tarea retirada' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo cambiar la publicación', message: error.message });
  }
};

const eliminarTareaControlador = async (req, res) => {
  const tareaId = Number(req.params.id);
  const profesorUsuario = req.headers['x-user-name'];
  if (!Number.isInteger(tareaId) || tareaId <= 0 || !profesorUsuario) {
    return res.status(400).json({ ok: false, error: 'Datos de tarea inválidos' });
  }

  try {
    const eliminada = await eliminarTarea({ tareaId, profesorUsuario });
    if (!eliminada) return res.status(404).json({ ok: false, error: 'Tarea no encontrada' });
    return res.json({ ok: true, message: 'Tarea eliminada' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar la tarea', message: error.message });
  }
};

const tareasPorCursoControlador = async (req, res) => {
  const { curso } = req.params;

  if (!curso) {
    return res.status(400).json({ ok: false, error: 'Curso requerido' });
  }

  try {
    const tareas = await listarTareasPorCurso(curso);
    return res.json({ ok: true, total: tareas.length, data: tareas });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener tareas', message: error.message });
  }
};

export {
  crearTareaControlador,
  listarTareasProfesorControlador,
  publicarTareaControlador,
  eliminarTareaControlador,
  tareasPorCursoControlador
};
