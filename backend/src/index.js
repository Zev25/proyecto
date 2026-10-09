import { router } from './config.js';
import { conexion } from './db.js';
import { crearUsuario, obtenerUsuarios, obtenerUsuarioPorId, borrarUsuario } from './controladores/usuarios.js';
import { loginUsuario } from './controladores/auth.js';
import { buscarUsuarioPorUsuario } from './controladores/admin.js';
import { autorizarRoles } from './middleware/autorizarRoles.js';
import {
  crearEvaluacionConPreguntas,
  listarEvaluacionesConPreguntas,
  responderEvaluacionAuto,
  verIntentosProfesor,
  verDetalleIntento
} from './controladores/evaluaciones.js';
import { crearTarea, listarTareasPorCurso, listarTareasPorProfesor } from './controladores/tareas.js';
import {
  obtenerResumenAlumno,
  obtenerCursosAlumnoPorUsuario,
  listarTareasAlumno,
  listarIntentosAlumno,
  verDetalleIntentoAlumno
} from './controladores/alumno.js';
import {
  obtenerResumenAdmin,
  listarUsuariosAdmin,
  obtenerResumenCursosAdmin,
  listarTareasProfesorAdmin,
  listarEvaluacionesProfesorAdmin,
  cambiarRolUsuarioAdmin,
  actualizarCursoUsuarioAdmin,
  actualizarEstadoUsuarioAdmin,
  ROLES_VALIDOS,
  ESTADOS_VALIDOS,
  CURSOS_VALIDOS
} from './controladores/adminPanel.js';
import {
  crearInvitacionCursoAdmin,
  canjearInvitacionCursoAlumno
} from './controladores/invitaciones.js';

const asegurarEstadoUsuario = async () => {
  try {
    const [columnasEstado] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Usuario'
         AND COLUMN_NAME = 'estado'`
    );

    if (Number(columnasEstado?.[0]?.total || 0) === 0) {
      await conexion.query(
        "ALTER TABLE Usuario ADD COLUMN estado ENUM('activo','inactivo','bloqueado') NOT NULL DEFAULT 'activo'"
      );
    }

    const [columnasEmail] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Usuario'
         AND COLUMN_NAME = 'email'`
    );

    if (Number(columnasEmail?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Usuario ADD COLUMN email VARCHAR(191) NULL');
    }

    const [indiceEmail] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Usuario'
         AND INDEX_NAME = 'uq_usuario_email'`
    );

    if (Number(indiceEmail?.[0]?.total || 0) === 0) {
      await conexion.query('CREATE UNIQUE INDEX uq_usuario_email ON Usuario (email)');
    }

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS UsuarioCurso (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        curso VARCHAR(100) NOT NULL,
        UNIQUE KEY uq_usuario_curso (usuario_id, curso),
        INDEX idx_usuariocurso_curso (curso),
        CONSTRAINT fk_usuariocurso_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE
      )`
    );

    await conexion.query(
      `INSERT IGNORE INTO UsuarioCurso (usuario_id, curso)
       SELECT id, curso
       FROM Usuario
       WHERE tipo = 'alumno' AND curso IS NOT NULL AND TRIM(curso) <> ''`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS InvitacionCurso (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_hash CHAR(64) NOT NULL,
        codigo_ultimos4 VARCHAR(4) NOT NULL,
        cursos_json TEXT NOT NULL,
        creado_por VARCHAR(100) NULL,
        expira_en DATETIME NOT NULL,
        cupo_maximo INT NOT NULL DEFAULT 1,
        usos_actuales INT NOT NULL DEFAULT 0,
        activa TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_invitacion_codigo_hash (codigo_hash)
      )`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS InvitacionCursoCanje (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invitacion_id INT NOT NULL,
        alumno_usuario VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_invitacion_alumno (invitacion_id, alumno_usuario),
        INDEX idx_canje_alumno (alumno_usuario),
        CONSTRAINT fk_canje_invitacion FOREIGN KEY (invitacion_id) REFERENCES InvitacionCurso(id) ON DELETE CASCADE
      )`
    );
  } catch (error) {
    console.error('No se pudo asegurar columna estado en Usuario:', error.message);
  }
};

await asegurarEstadoUsuario();

router.get('/', (req, res) => {
  res.json({ ok: true, message: 'API funcionando' });
});

router.post('/registro', async (req, res) => {
  const { nombre, apellido, email, usuario, contrasena, tipo, curso, cursos } = req.body || {};

  if (!nombre || !apellido || !email || !usuario || !contrasena || !tipo) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const emailNormalizado = String(email).trim().toLowerCase();
  if (emailNormalizado.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }

  try {
    const cursosAlumno = Array.isArray(cursos)
      ? cursos.filter((item) => typeof item === 'string' && item.trim())
      : [];

    const cursoPrincipal = tipo === 'alumno'
      ? (cursosAlumno[0] || curso || null)
      : null;

    const result = await crearUsuario({
      nombre,
      apellido,
      email: emailNormalizado,
      usuario,
      contrasena,
      tipo,
      curso: cursoPrincipal,
      cursos: tipo === 'alumno' ? cursosAlumno : []
    });

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      insertId: result.insertId,
      data: {
        nombre,
        apellido,
        email: emailNormalizado,
        usuario,
        tipo,
        curso: cursoPrincipal,
        cursos: tipo === 'alumno' ? (cursosAlumno.length > 0 ? cursosAlumno : (cursoPrincipal ? [cursoPrincipal] : [])) : []
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El correo electrónico o usuario ya está registrado' });
    }

    return res.status(500).json({
      error: 'No se pudo registrar el usuario',
      message: error.message
    });
  }
});

router.get('/usuarios', async (req, res) => {
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
});

router.get('/usuarios/:id', async (req, res) => {
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
});

router.delete('/usuarios/:id', async (req, res) => {
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
});

router.get('/db-health', async (req, res) => {
  try {
    const [rows] = await conexion.query('SELECT 1 + 1 AS result');
    return res.json({ ok:true, dbResult: rows[0].result });
  } catch (error) {
    return res.status(500).json({ ok:false, db:'error', message: error.message });
  }
});



//Seccion de rutas para Login/Registro.
router.post('/login', async (req,res) => {
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
});




// Admin routes
router.get('/admin/buscar-usuario', async (req, res) => {
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
});

router.get('/admin/resumen', autorizarRoles('admin'), async (req, res) => {
  try {
    const data = await obtenerResumenAdmin();
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener resumen admin', message: error.message });
  }
});

router.get('/admin/cursos/resumen', autorizarRoles('admin'), async (req, res) => {
  try {
    const data = await obtenerResumenCursosAdmin();
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener resumen por cursos', message: error.message });
  }
});

router.get('/admin/usuarios', autorizarRoles('admin'), async (req, res) => {
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
});

router.get('/admin/profesores/:usuario/tareas', autorizarRoles('admin'), async (req, res) => {
  const profesorUsuario = req.params.usuario;

  try {
    const data = await listarTareasProfesorAdmin(profesorUsuario);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar tareas del profesor', message: error.message });
  }
});

router.get('/admin/profesores/:usuario/evaluaciones', autorizarRoles('admin'), async (req, res) => {
  const profesorUsuario = req.params.usuario;

  try {
    const data = await listarEvaluacionesProfesorAdmin(profesorUsuario);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar evaluaciones del profesor', message: error.message });
  }
});

router.patch('/admin/usuarios/:usuario/rol', autorizarRoles('admin'), async (req, res) => {
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
});

router.patch('/admin/usuarios/:usuario/curso', autorizarRoles('admin'), async (req, res) => {
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
});

router.patch('/admin/usuarios/:usuario/estado', autorizarRoles('admin'), async (req, res) => {
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
});

router.post('/admin/invitaciones/cursos', autorizarRoles('admin'), async (req, res) => {
  const { cursos, expiraEnHoras, cupoMaximo, adminUsuario } = req.body || {};

  try {
    const result = await crearInvitacionCursoAdmin({
      adminUsuario: adminUsuario || req.headers['x-user-name'] || null,
      cursos,
      expiraEnHoras,
      cupoMaximo
    });

    if (!result.ok) {
      if (result.code === 'CURSOS_REQUERIDOS') {
        return res.status(400).json({ ok: false, error: 'Debes enviar al menos un curso' });
      }
      if (result.code === 'CURSO_INVALIDO') {
        return res.status(400).json({ ok: false, error: 'Curso inválido', permitidos: CURSOS_VALIDOS });
      }

      return res.status(500).json({ ok: false, error: 'No se pudo generar código de invitación', code: result.code });
    }

    return res.status(201).json({
      ok: true,
      message: 'Código de invitación creado',
      codigo: result.codigo,
      data: result.data
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo crear invitación', message: error.message });
  }
});

router.get('/panel-alumno', (req, res) => {
  const tipo = req.body?.tipo || req.query?.tipo || req.headers['x-user-role'];

  if (tipo !== 'alumno') {
    return res.status(403).json({
      ok: false,
      error: 'No autorizado para panel de alumno'
    });
  }

  return res.json({
    ok: true,
    message: 'Bienvenido al panel de alumno'
  });
});

router.get('/panel-profesor', autorizarRoles('profesor'), (req, res) => {
  return res.json({
    ok: true,
    message: 'Bienvenido al panel de profesor'
  });
});

router.get('/panel-admin', autorizarRoles('admin'), (req, res) => {
  return res.json({
    ok: true,
    message: 'Bienvenido al panel de administrador'
  });
});



// rutas para evaluaciones

router.post('/profesor/evaluaciones', autorizarRoles('profesor'), async (req, res) => {
  const { titulo, curso, preguntas } = req.body || {};

  if (!titulo || !curso || !Array.isArray(preguntas) || preguntas.length === 0 || preguntas.length > 10) {
    return res.status(400).json({ ok: false, error: 'Debes enviar un título, curso y entre 1 y 10 preguntas' });
  }

  try {
    const profesorUsuario = req.body?.usuario || 'profesor-demo';
    const result = await crearEvaluacionConPreguntas({ titulo, curso, profesorUsuario, preguntas });
    return res.status(201).json({ ok: true, message: 'Evaluacion creada', evaluacionId: result.evaluacionId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo crear evaluacion', message: error.message });
  }
});

router.get('/alumno/evaluaciones', autorizarRoles('alumno'), async (req, res) => {
  const curso = req.query?.curso || req.headers['x-user-curso'];
  const usuario = req.query?.usuario || req.headers['x-user-name'];

  if (!curso && !usuario) {
    return res.status(400).json({ ok: false, error: 'Debes enviar usuario o curso' });
  }

  try {
    const cursos = curso
      ? [curso]
      : (usuario ? await obtenerCursosAlumnoPorUsuario(usuario) : []);

    const data = await listarEvaluacionesConPreguntas(cursos);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar evaluaciones', message: error.message });
  }
});

router.get('/alumno/resumen', autorizarRoles('alumno'), async (req, res) => {
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
});

router.get('/alumno/tareas', autorizarRoles('alumno'), async (req, res) => {
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
});

router.get('/alumno/intentos', autorizarRoles('alumno'), async (req, res) => {
  const usuario = req.query?.usuario || req.headers['x-user-name'];

  if (!usuario) {
    return res.status(400).json({ ok: false, error: 'Usuario requerido' });
  }

  try {
    const data = await listarIntentosAlumno(usuario);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener intentos del alumno', message: error.message });
  }
});

router.get('/alumno/intentos/:intentoId', autorizarRoles('alumno'), async (req, res) => {
  const intentoId = Number(req.params.intentoId);
  const usuario = req.query?.usuario || req.headers['x-user-name'];

  if (!Number.isInteger(intentoId) || intentoId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de intento invalido' });
  }

  if (!usuario) {
    return res.status(400).json({ ok: false, error: 'Usuario requerido' });
  }

  try {
    const data = await verDetalleIntentoAlumno({ intentoId, usuario });
    if (!data) return res.status(404).json({ ok: false, error: 'Intento no encontrado' });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener detalle del intento', message: error.message });
  }
});

router.post('/alumno/evaluaciones/:id/responder', autorizarRoles('alumno'), async (req, res) => {
  const evaluacionId = Number(req.params.id);
  const { respuestas, usuario } = req.body || {};

  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluacion invalido' });
  }

  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    return res.status(400).json({ ok: false, error: 'Debes enviar respuestas' });
  }

  try {
    const result = await responderEvaluacionAuto({
      evaluacionId,
      alumnoUsuario: usuario || 'alumno-demo',
      respuestas
    });

    return res.json({
      ok: true,
      message: 'Examen respondido y autoevaluado',
      intentoId: result.intentoId,
      notaTotal: result.notaTotal
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo registrar el intento', message: error.message });
  }
});

router.post('/alumno/invitaciones/canjear', autorizarRoles('alumno'), async (req, res) => {
  const { codigo, usuario } = req.body || {};
  const alumnoUsuario = usuario || req.headers['x-user-name'];

  if (!alumnoUsuario) {
    return res.status(400).json({ ok: false, error: 'Usuario requerido' });
  }

  if (!codigo) {
    return res.status(400).json({ ok: false, error: 'Código requerido' });
  }

  try {
    const result = await canjearInvitacionCursoAlumno({
      alumnoUsuario,
      codigo
    });

    if (!result.ok) {
      if (result.code === 'CODIGO_INVALIDO') return res.status(404).json({ ok: false, error: 'Código inválido' });
      if (result.code === 'CODIGO_EXPIRADO') return res.status(410).json({ ok: false, error: 'Código expirado' });
      if (result.code === 'SIN_CUPOS') return res.status(409).json({ ok: false, error: 'Código sin cupos disponibles' });
      if (result.code === 'YA_CANJEADO') return res.status(409).json({ ok: false, error: 'Este código ya fue canjeado por este alumno' });
      if (result.code === 'YA_INSCRITO') return res.status(409).json({ ok: false, error: 'Alumno ya inscrito en todos los cursos de la invitación' });
      if (result.code === 'ALUMNO_NO_ENCONTRADO') return res.status(404).json({ ok: false, error: 'Alumno no encontrado' });
      if (result.code === 'ALUMNO_NO_ACTIVO') return res.status(403).json({ ok: false, error: 'Alumno inactivo o bloqueado' });

      return res.status(400).json({ ok: false, error: 'No se pudo canjear invitación', code: result.code });
    }

    return res.json({ ok: true, message: 'Invitación canjeada correctamente', data: result.data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo canjear invitación', message: error.message });
  }
});

router.post('/profesor/tareas', autorizarRoles('profesor'), async (req, res) => {
  const { titulo, descripcion, curso, profesorUsuario, fechaVencimiento } = req.body || {};

  if (!titulo || !curso || !profesorUsuario) {
    return res.status(400).json({ ok: false, error: 'Faltan datos para crear la tarea' });
  }

  try {
    const result = await crearTarea({ titulo, descripcion: descripcion || '', curso, profesorUsuario, fechaVencimiento });
    return res.status(201).json({ ok: true, message: 'Tarea creada', tareaId: result.insertId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo crear la tarea', message: error.message });
  }
});

router.get('/profesor/tareas', autorizarRoles('profesor'), async (req, res) => {
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
});

router.get('/tareas/:curso', async (req, res) => {
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
});

router.get('/profesor/evaluaciones/:id/intentos', autorizarRoles('profesor'), async (req, res) => {
  const evaluacionId = Number(req.params.id);
  if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de evaluacion invalido' });
  }

  try {
    const data = await verIntentosProfesor(evaluacionId);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener intentos', message: error.message });
  }
});

router.get('/profesor/intentos/:intentoId', autorizarRoles('profesor'), async (req, res) => {
  const intentoId = Number(req.params.intentoId);
  if (!Number.isInteger(intentoId) || intentoId <= 0) {
    return res.status(400).json({ ok: false, error: 'ID de intento invalido' });
  }

  try {
    const detalle = await verDetalleIntento(intentoId);
    if (!detalle) return res.status(404).json({ ok: false, error: 'Intento no encontrado' });
    return res.json({ ok: true, data: detalle });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo leer el intento', message: error.message });
  }
});









