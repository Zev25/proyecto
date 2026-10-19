import multer from 'multer';
import { router } from './config.js';
import { conexion } from './db.js';
import { autorizarRoles } from './middleware/autorizarRoles.js';
import { parsearPreguntasExcel } from './servicios/evaluacionesExcel.js';

// Controladores de acceso y usuarios
import { loginUsuario } from './controladores/auth.js';
import { buscarUsuarioPorUsuario } from './controladores/admin.js';
import {
  borrarUsuario,
  crearUsuario,
  obtenerUsuarioPorId,
  obtenerUsuarios
} from './controladores/usuarios.js';

// Controladores de profesor y alumno
import {
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
} from './controladores/evaluaciones.js';
import {
  crearTarea,
  listarTareasPorCurso,
  listarTareasPorProfesor
} from './controladores/tareas.js';
import {
  obtenerCursosAlumnoPorUsuario,
  obtenerResumenAlumno,
  listarIntentosAlumno,
  listarTareasAlumno,
  verDetalleIntentoAlumno
} from './controladores/alumno.js';

// Controladores de administracion
import {
  actualizarCursoUsuarioAdmin,
  actualizarEstadoUsuarioAdmin,
  cambiarRolUsuarioAdmin,
  CURSOS_VALIDOS,
  ESTADOS_VALIDOS,
  listarEvaluacionesProfesorAdmin,
  listarTareasProfesorAdmin,
  listarUsuariosAdmin,
  obtenerResumenAdmin,
  obtenerResumenCursosAdmin,
} from './controladores/adminPanel.js';
import {
  canjearInvitacionCursoAlumno,
  crearInvitacionCursoAdmin
} from './controladores/invitaciones.js';
import { crearOfertaAcademica, listarOfertasAcademicas, listarOfertasAlumno } from './controladores/ofertas.js';

const cargarExcelEvaluacion = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 4 },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      return callback(new Error('Solo se admiten archivos .xlsx'));
    }
    return callback(null, true);
  }
}).single('archivo');

const fechaIsoValida = (fecha) => {
  if (fecha === null || fecha === undefined || fecha === '') return true;
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  return fechaUtc.getUTCFullYear() === anio
    && fechaUtc.getUTCMonth() === mes - 1
    && fechaUtc.getUTCDate() === dia;
};

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

    const [[maxPreguntasColumn]] = await conexion.query(
      `SELECT COLUMN_DEFAULT AS valor
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'max_preguntas'
       LIMIT 1`
    );

    if (Number(maxPreguntasColumn?.valor || 0) !== 50) {
      await conexion.query('ALTER TABLE Evaluacion ALTER COLUMN max_preguntas SET DEFAULT 50');
    }

    const [columnaPreguntasIntento] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'preguntas_por_intento'`
    );

    if (Number(columnaPreguntasIntento?.[0]?.total || 0) === 0) {
      await conexion.query(
        'ALTER TABLE Evaluacion ADD COLUMN preguntas_por_intento INT NOT NULL DEFAULT 20 AFTER max_preguntas'
      );
    }

    const [columnaFechaFinEvaluacion] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'fecha_fin'`
    );

    if (Number(columnaFechaFinEvaluacion?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Evaluacion ADD COLUMN fecha_fin DATE DEFAULT NULL AFTER preguntas_por_intento');
    }

    const [columnaCategoriaEvaluacion] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'categoria'`
    );

    if (Number(columnaCategoriaEvaluacion?.[0]?.total || 0) === 0) {
      await conexion.query("ALTER TABLE Evaluacion ADD COLUMN categoria ENUM('evaluacion', 'examen_final') NOT NULL DEFAULT 'evaluacion' AFTER fecha_fin");
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
      `CREATE TABLE IF NOT EXISTS Curso (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_curso_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS OfertaCurso (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        curso_id INT NOT NULL,
        turno VARCHAR(30) NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        cupo_maximo INT NOT NULL,
        activa TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_oferta_curso_turno (curso_id, turno),
        KEY idx_oferta_curso_activa (activa),
        CONSTRAINT fk_oferta_curso FOREIGN KEY (curso_id) REFERENCES Curso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS Clase (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        oferta_id INT NOT NULL,
        materia VARCHAR(100) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        modalidad ENUM('semanal', 'entregas') NOT NULL DEFAULT 'semanal',
        horario VARCHAR(150) DEFAULT NULL,
        codigo_legacy VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_clase_oferta_nombre (oferta_id, nombre),
        KEY idx_clase_codigo_legacy (codigo_legacy),
        CONSTRAINT fk_clase_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS MatriculaOferta (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        oferta_id INT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_matricula_usuario_oferta (usuario_id, oferta_id),
        KEY idx_matricula_oferta (oferta_id),
        CONSTRAINT fk_matricula_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE,
        CONSTRAINT fk_matricula_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS Curso (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_curso_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS OfertaCurso (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        curso_id INT NOT NULL,
        turno VARCHAR(30) NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        cupo_maximo INT NOT NULL,
        activa TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_oferta_curso_turno (curso_id, turno),
        KEY idx_oferta_curso_activa (activa),
        CONSTRAINT fk_oferta_curso FOREIGN KEY (curso_id) REFERENCES Curso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS Clase (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        oferta_id INT NOT NULL,
        materia VARCHAR(100) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        modalidad ENUM('semanal', 'entregas') NOT NULL DEFAULT 'semanal',
        horario VARCHAR(150) DEFAULT NULL,
        codigo_legacy VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_clase_oferta_nombre (oferta_id, nombre),
        KEY idx_clase_codigo_legacy (codigo_legacy),
        CONSTRAINT fk_clase_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS MatriculaOferta (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        oferta_id INT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_matricula_usuario_oferta (usuario_id, oferta_id),
        KEY idx_matricula_oferta (oferta_id),
        CONSTRAINT fk_matricula_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE,
        CONSTRAINT fk_matricula_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [columnasAlumnoIntento] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Intento'
         AND COLUMN_NAME = 'alumno_id'`
    );

    if (Number(columnasAlumnoIntento?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Intento ADD COLUMN alumno_id INT NULL AFTER evaluacion_id');
    }

    await conexion.query(
      `UPDATE Intento i
       JOIN Usuario u ON u.usuario = i.alumno_usuario AND u.tipo = 'alumno'
       SET i.alumno_id = u.id
       WHERE i.alumno_id IS NULL`
    );

    const [fkIntentoAlumno] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Intento'
         AND CONSTRAINT_NAME = 'fk_intento_alumno_id'`
    );

    if (Number(fkIntentoAlumno?.[0]?.total || 0) === 0) {
      await conexion.query(
        `ALTER TABLE Intento
         ADD CONSTRAINT fk_intento_alumno_id
         FOREIGN KEY (alumno_id) REFERENCES Usuario(id) ON DELETE SET NULL`
      );
    }

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS IntentoPregunta (
        intento_id INT NOT NULL,
        pregunta_id INT NOT NULL,
        orden SMALLINT UNSIGNED NOT NULL,
        PRIMARY KEY (intento_id, pregunta_id),
        UNIQUE KEY uq_intento_pregunta_orden (intento_id, orden),
        CONSTRAINT fk_intentopregunta_intento FOREIGN KEY (intento_id) REFERENCES Intento(id) ON DELETE CASCADE,
        CONSTRAINT fk_intentopregunta_pregunta FOREIGN KEY (pregunta_id) REFERENCES Pregunta(id) ON DELETE CASCADE
      )`
    );

    await conexion.query(
      `INSERT IGNORE INTO IntentoPregunta (intento_id, pregunta_id, orden)
       SELECT r.intento_id, r.pregunta_id,
              ROW_NUMBER() OVER (PARTITION BY r.intento_id ORDER BY r.id)
       FROM Respuesta r
       JOIN Intento i ON i.id = r.intento_id
       JOIN Pregunta p ON p.id = r.pregunta_id AND p.evaluacion_id = i.evaluacion_id`
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

    const [columnaOfertasInvitacion] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'InvitacionCurso'
         AND COLUMN_NAME = 'oferta_ids_json'`
    );
    if (Number(columnaOfertasInvitacion?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE InvitacionCurso ADD COLUMN oferta_ids_json TEXT NULL AFTER cursos_json');
    }

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
router.get('/admin/ofertas', autorizarRoles('admin'), async (_req, res) => {
  try {
    const data = await listarOfertasAcademicas();
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar las ofertas', message: error.message });
  }
});

router.get('/profesor/ofertas', autorizarRoles('profesor'), async (_req, res) => {
  try {
    const data = await listarOfertasAcademicas();
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar las ofertas', message: error.message });
  }
});

router.post('/admin/ofertas', autorizarRoles('admin'), async (req, res) => {
  const { curso, turno, horaInicio, horaFin, cupoMaximo, clases } = req.body || {};

  try {
    const result = await crearOfertaAcademica({ curso, turno, horaInicio, horaFin, cupoMaximo, clases });
    if (!result.ok) {
      const mensajes = {
        CURSO_REQUERIDO: 'Indica el nombre del curso',
        TURNO_REQUERIDO: 'Indica el turno',
        HORARIO_INVALIDO: 'El horario debe ser válido y la hora de fin posterior al inicio',
        CUPO_INVALIDO: 'El cupo máximo debe ser un entero positivo',
        CLASES_INVALIDAS: 'La oferta debe incluir entre 1 y 50 clases',
        CLASE_INVALIDA: 'Revisa materia, nombre, modalidad y horario de cada clase',
        CLASE_DUPLICADA: 'Los nombres de clase no pueden repetirse en la misma oferta',
        OFERTA_DUPLICADA: 'Ya existe una oferta para ese curso y turno'
      };
      return res.status(400).json({ ok: false, error: mensajes[result.code] || 'La oferta no es válida', code: result.code });
    }

    return res.status(201).json({ ok: true, message: 'Oferta creada', ofertaId: result.ofertaId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo crear la oferta', message: error.message });
  }
});

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
  const { cursos, ofertaIds, expiraEnHoras, cupoMaximo, adminUsuario } = req.body || {};

  try {
    const result = await crearInvitacionCursoAdmin({
      adminUsuario: adminUsuario || req.headers['x-user-name'] || null,
      cursos,
      ofertaIds,
      expiraEnHoras,
      cupoMaximo
    });

    if (!result.ok) {
      if (result.code === 'CURSOS_O_OFERTAS_REQUERIDOS') {
        return res.status(400).json({ ok: false, error: 'Selecciona al menos una oferta o curso' });
      }
      if (result.code === 'CURSO_INVALIDO') {
        return res.status(400).json({ ok: false, error: 'Curso inválido', permitidos: CURSOS_VALIDOS });
      }
      if (result.code === 'OFERTAS_INVALIDAS') {
        return res.status(400).json({ ok: false, error: 'Una o más ofertas no existen o están inactivas' });
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
  const { titulo, curso, preguntas, preguntasPorIntento, fechaFin, categoria } = req.body || {};

  if (!titulo || !curso || !Array.isArray(preguntas) || preguntas.length === 0 || preguntas.length > 50) {
    return res.status(400).json({ ok: false, error: 'Debes enviar un título, curso y entre 1 y 50 preguntas' });
  }
  if (!fechaIsoValida(fechaFin)) {
    return res.status(400).json({ ok: false, error: 'La fecha de fin debe tener formato AAAA-MM-DD y ser válida' });
  }

  try {
    const profesorUsuario = req.body?.usuario || 'profesor-demo';
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
});

router.get('/profesor/evaluaciones', autorizarRoles('profesor'), async (req, res) => {
  const profesorUsuario = req.headers['x-user-name'] || req.query?.usuario;
  if (!profesorUsuario) return res.status(400).json({ ok: false, error: 'Falta identificar al profesor' });

  try {
    const data = await listarEvaluacionesProfesor(profesorUsuario);
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar las evaluaciones', message: error.message });
  }
});

router.patch('/profesor/evaluaciones/:id/categoria', autorizarRoles('profesor'), async (req, res) => {
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
});

router.get('/profesor/evaluaciones/:id', autorizarRoles('profesor'), async (req, res) => {
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
});

router.put('/profesor/evaluaciones/:id', autorizarRoles('profesor'), async (req, res) => {
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
});

router.post('/profesor/evaluaciones/importar-excel', autorizarRoles('profesor'), (req, res) => {
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

    const data = await listarEvaluacionesDisponibles(cursos);
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar evaluaciones', message: error.message });
  }
});

router.get('/alumno/ofertas', autorizarRoles('alumno'), async (req, res) => {
  const alumnoUsuario = req.user?.usuario || req.headers['x-user-name'] || req.query?.usuario;
  if (!alumnoUsuario) return res.status(400).json({ ok: false, error: 'Debes enviar usuario' });

  try {
    const result = await listarOfertasAlumno(alumnoUsuario);
    if (!result.ok && result.code === 'ALUMNO_NO_ENCONTRADO') {
      return res.status(404).json({ ok: false, error: 'Alumno no encontrado' });
    }
    if (!result.ok && result.code === 'ALUMNO_NO_ACTIVO') {
      return res.status(403).json({ ok: false, error: 'Alumno inactivo o bloqueado' });
    }
    return res.json({ ok: true, total: result.ofertas.length, data: result.ofertas });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar las ofertas del alumno', message: error.message });
  }
});

router.post('/alumno/evaluaciones/:id/intentos', autorizarRoles('alumno'), async (req, res) => {
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
      if (result.code === 'ALUMNO_NO_ACTIVO') return res.status(403).json({ ok: false, error: 'Alumno inactivo o bloqueado' });
      if (result.code === 'ALUMNO_NO_MATRICULADO') return res.status(403).json({ ok: false, error: 'El alumno no está inscrito en este curso' });
      if (result.code === 'BANCO_INSUFICIENTE') return res.status(409).json({ ok: false, error: 'La evaluación no tiene suficientes preguntas', disponibles: result.disponibles, requeridas: result.requeridas });
      return res.status(400).json({ ok: false, error: 'No se pudo iniciar el intento', code: result.code });
    }

    return res.status(201).json({ ok: true, message: 'Intento iniciado', data: result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo iniciar el intento', message: error.message });
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
});

router.get('/alumno/intentos/:intentoId', autorizarRoles('alumno'), async (req, res) => {
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
});

router.post('/alumno/evaluaciones/:id/responder', autorizarRoles('alumno'), async (req, res) => {
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
      if (result.code === 'OFERTA_SIN_CUPOS') return res.status(409).json({ ok: false, error: `La oferta ${result.curso} · ${result.turno} ya no tiene cupos disponibles` });
      if (result.code === 'OFERTA_INVALIDA') return res.status(409).json({ ok: false, error: 'Una oferta de la invitación ya no está activa' });
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
});

router.get('/profesor/intentos/:intentoId', autorizarRoles('profesor'), async (req, res) => {
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
});









