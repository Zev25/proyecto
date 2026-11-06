import { borrarUsuario, obtenerUsuarioPorId, obtenerUsuarios } from './usuarios.js';

const listarUsuariosControlador = async (req, res) => {
  try {
    const usuarios = await obtenerUsuarios();
    return res.json({ ok: true, total: usuarios.length, data: usuarios });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo obtener la lista de usuarios',
      message: error.message
    });
  }
};

const obtenerUsuarioControlador = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'ID inválido' });
  }

  try {
    const usuario = await obtenerUsuarioPorId(id);

    if (!usuario) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    return res.json({ ok: true, data: usuario });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo obtener el usuario',
      message: error.message
    });
  }
};

const eliminarUsuarioControlador = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'ID inválido' });
  }

  try {
    const usuarioExistente = await obtenerUsuarioPorId(id);

    if (!usuarioExistente) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    const result = await borrarUsuario(id);

    return res.json({
      ok: true,
      deletedId: id,
      affectedRows: result.affectedRows,
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo eliminar el usuario',
      message: error.message
    });
  }
};

export { listarUsuariosControlador, obtenerUsuarioControlador, eliminarUsuarioControlador };
