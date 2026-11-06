import { loginUsuario } from './login.js';
import { registrarUsuario } from './registro.js';

const registroControlador = async (req, res) => {
  try {
    const result = await registrarUsuario(req.body || {});

    if (!result.ok) {
      if (result.code === 'DATOS_INCOMPLETOS') return res.status(400).json({ error: 'Faltan datos requeridos' });
      if (result.code === 'EMAIL_INVALIDO') return res.status(400).json({ error: 'Correo electrónico inválido' });
      if (result.code === 'USUARIO_DUPLICADO') return res.status(409).json({ error: 'El correo electrónico o usuario ya está registrado' });
    }

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      insertId: result.insertId,
      data: result.data
    });
  } catch (error) {
    return res.status(500).json({
      error: 'No se pudo registrar el usuario',
      message: error.message
    });
  }
};

const loginControlador = async (req,res) => {
  const { usuario, contrasena } = req.body || {};

  if (!usuario || !contrasena) {
    return res.status(400).json({ ok: false, error: 'Faltan datos requeridos' });
  }

  try { 
    const resultadoLogin = await loginUsuario({ usuario, contrasena });

    if (!resultadoLogin.ok) {
      if (resultadoLogin.code === 'USUARIO_NO_ACTIVO') {
        return res.status(403).json({
          ok: false,
          error: 'Usuario inactivo o bloqueado',
          estado: resultadoLogin.estado
        });
      }

      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    const usuarioEncontrado = resultadoLogin.user;

    return res.json({ ok: true, message: 'Login exitoso', user: { id: usuarioEncontrado.id, nombre: usuarioEncontrado.nombre, apellido: usuarioEncontrado.apellido, usuario: usuarioEncontrado.usuario, tipo: usuarioEncontrado.tipo, curso: usuarioEncontrado.curso || null, cursos: usuarioEncontrado.cursos || (usuarioEncontrado.curso ? [usuarioEncontrado.curso] : []), estado: usuarioEncontrado.estado || 'activo' } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'NO se logro iniciar sesión', message: error.message });
  }
};

export { registroControlador, loginControlador };
