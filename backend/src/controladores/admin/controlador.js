import { buscarUsuarioPorUsuario } from './buscarUsuario.js';
import { CURSOS_VALIDOS, ESTADOS_VALIDOS, ROLES_VALIDOS } from './constantes.js';
import {
  actualizarCursoUsuarioAdmin,
  actualizarEstadoUsuarioAdmin,
  cambiarRolUsuarioAdmin,
  listarUsuariosAdmin
} from './usuarios.js';
import { obtenerResumenAdmin, obtenerResumenCursosAdmin } from './resumen.js';
import { listarEvaluacionesProfesorAdmin, listarTareasProfesorAdmin } from './contenidoProfesor.js';

const buscarUsuarioControlador = async (req, res) => {
  const { usuario } = req.query || {};

  try {
    const resultados = await buscarUsuarioPorUsuario(usuario || '');

    return res.json({
      ok: true,
      total: resultados.length,
      data: resultados
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo buscar usuarios',
      message: error.message
    });
  }
};

const resumenAdminControlador = async (req, res) => {
  try {
    const data = await obtenerResumenAdmin();
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener resumen admin', message: error.message });
  }
};

const resumenCursosAdminControlador = async (req, res) => {
  try {
    const data = await obtenerResumenCursosAdmin();
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener resumen por cursos', message: error.message });
  }
};

const listarUsuariosAdminControlador = async (req, res) => {
  const { tipo, curso, texto } = req.query || {};

  try {
    const data = await listarUsuariosAdmin({
      tipo: tipo || null,
      curso: curso || null,
      texto: texto || ''
    });

    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar usuarios', message: error.message });
  }
};

const tareasProfesorAdminControlador = async (req, res) => {
  const profesorUsuario = req.params.usuario;

  try {
    const data = await listarTareasProfesorAdmin(profesorUsuario);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar tareas del profesor', message: error.message });
  }
};

const evaluacionesProfesorAdminControlador = async (req, res) => {
  const profesorUsuario = req.params.usuario;

  try {
    const data = await listarEvaluacionesProfesorAdmin(profesorUsuario);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar evaluaciones del profesor', message: error.message });
  }
};

const cambiarRolControlador = async (req, res) => {
  const { usuario } = req.params;
  const { nuevoRol } = req.body || {};

  if (!nuevoRol) {
    return res.status(400).json({ ok: false, error: 'Debes enviar nuevoRol' });
  }

  if (!ROLES_VALIDOS.includes(nuevoRol)) {
    return res.status(400).json({ ok: false, error: 'Rol inválido', permitidos: ROLES_VALIDOS });
  }

  try {
    const result = await cambiarRolUsuarioAdmin({
      usuarioObjetivo: usuario,
      nuevoRol
    });

    if (!result.ok) {
      if (result.code === 'USUARIO_NO_ENCONTRADO') {
        return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      }
      if (result.code === 'ULTIMO_ADMIN_ACTIVO') {
        return res.status(409).json({ ok: false, error: 'No se puede modificar el último admin activo' });
      }
      return res.status(400).json({ ok: false, error: 'No se pudo actualizar el rol', code: result.code });
    }

    return res.json({
      ok: true,
      message: 'Rol actualizado correctamente',
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo actualizar el rol',
      message: error.message
    });
  }
};

const cambiarCursoControlador = async (req, res) => {
  const { usuario } = req.params;
  const { curso, cursos } = req.body || {};

  const cursosObjetivo = Array.isArray(cursos)
    ? cursos
    : (curso ? [curso] : []);

  try {
    const result = await actualizarCursoUsuarioAdmin({
      usuarioObjetivo: usuario,
      cursos: cursosObjetivo
    });

    if (!result.ok) {
      if (result.code === 'USUARIO_NO_ENCONTRADO') {
        return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      }
      if (result.code === 'SOLO_ALUMNO') {
        return res.status(400).json({ ok: false, error: 'Solo se puede cambiar curso a usuarios de tipo alumno' });
      }
      if (result.code === 'CURSO_INVALIDO') {
        return res.status(400).json({ ok: false, error: 'Curso inválido', permitidos: CURSOS_VALIDOS });
      }
      return res.status(400).json({ ok: false, error: 'No se pudo actualizar curso', code: result.code });
    }

    return res.json({ ok: true, message: 'Curso actualizado correctamente', data: result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar curso', message: error.message });
  }
};

const cambiarEstadoControlador = async (req, res) => {
  const { usuario } = req.params;
  const { estado } = req.body || {};

  if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ ok: false, error: 'Estado inválido', permitidos: ESTADOS_VALIDOS });
  }

  try {
    const result = await actualizarEstadoUsuarioAdmin({
      usuarioObjetivo: usuario,
      nuevoEstado: estado
    });

    if (!result.ok) {
      if (result.code === 'USUARIO_NO_ENCONTRADO') {
        return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      }
      if (result.code === 'ULTIMO_ADMIN_ACTIVO') {
        return res.status(409).json({ ok: false, error: 'No se puede desactivar o bloquear el último admin activo' });
      }
      return res.status(400).json({ ok: false, error: 'No se pudo actualizar estado', code: result.code });
    }

    return res.json({ ok: true, message: 'Estado actualizado correctamente', data: result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar estado', message: error.message });
  }
};

export {
  buscarUsuarioControlador,
  resumenAdminControlador,
  resumenCursosAdminControlador,
  listarUsuariosAdminControlador,
  tareasProfesorAdminControlador,
  evaluacionesProfesorAdminControlador,
  cambiarRolControlador,
  cambiarCursoControlador,
  cambiarEstadoControlador
};
