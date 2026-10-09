import { conexion } from '../db.js';

const ROLES_VALIDOS = ['alumno', 'profesor', 'admin'];
const ESTADOS_VALIDOS = ['activo', 'inactivo', 'bloqueado'];
const CURSOS_VALIDOS = ['diseño', 'redes', 'software', 'programacion-linux', 'frontend', 'administracion'];

const normalizarCursosEntrada = (entrada) => {
  const lista = Array.isArray(entrada) ? entrada : entrada ? [entrada] : [];
  const cursos = lista
    .map((curso) => (typeof curso === 'string' ? curso.trim() : ''))
    .filter(Boolean);

  return [...new Set(cursos)];
};

const obtenerCursosAlumnoPorId = async (connection, usuarioId, cursoFallback = null) => {
  const [rows] = await connection.query(
    'SELECT curso FROM UsuarioCurso WHERE usuario_id = ? ORDER BY curso ASC',
    [usuarioId]
  );

  const cursos = rows.map((row) => row.curso).filter(Boolean);
  if (cursos.length > 0) return cursos;

  return cursoFallback ? [cursoFallback] : [];
};

const obtenerUsuarioPorNombre = async (connection, usuario) => {
  const [rows] = await connection.query(
    'SELECT id, usuario, email, tipo, curso, estado FROM Usuario WHERE usuario = ? LIMIT 1',
    [usuario]
  );
  return rows[0] || null;
};

const contarAdminsActivos = async (connection) => {
  const [[row]] = await connection.query(
    "SELECT COUNT(*) AS total FROM Usuario WHERE tipo = 'admin' AND estado = 'activo'"
  );
  return Number(row.total || 0);
};

const obtenerResumenAdmin = async () => {
  const connection = await conexion.getConnection();

  try {
    const [[usuarios]] = await connection.query('SELECT COUNT(*) AS total FROM Usuario');
    const [[alumnos]] = await connection.query("SELECT COUNT(*) AS total FROM Usuario WHERE tipo = 'alumno'");
    const [[profesores]] = await connection.query("SELECT COUNT(*) AS total FROM Usuario WHERE tipo = 'profesor'");
    const [[admins]] = await connection.query("SELECT COUNT(*) AS total FROM Usuario WHERE tipo = 'admin'");
    const [[tareas]] = await connection.query('SELECT COUNT(*) AS total FROM Tarea');
    const [[evaluaciones]] = await connection.query('SELECT COUNT(*) AS total FROM Evaluacion');
    const [[intentos]] = await connection.query('SELECT COUNT(*) AS total FROM Intento');

    return {
      usuarios: Number(usuarios.total || 0),
      alumnos: Number(alumnos.total || 0),
      profesores: Number(profesores.total || 0),
      admins: Number(admins.total || 0),
      tareas: Number(tareas.total || 0),
      evaluaciones: Number(evaluaciones.total || 0),
      intentos: Number(intentos.total || 0)
    };
  } finally {
    connection.release();
  }
};

const listarUsuariosAdmin = async ({ tipo = null, curso = null, texto = '' }) => {
  const connection = await conexion.getConnection();

  try {
    const condiciones = [];
    const params = [];

    if (tipo) {
      condiciones.push('u.tipo = ?');
      params.push(tipo);
    }

    if (curso) {
      condiciones.push('(u.curso = ? OR uc.curso = ?)');
      params.push(curso);
      params.push(curso);
    }

    if (texto) {
      condiciones.push('(u.usuario LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ?)');
      params.push(`%${texto}%`, `%${texto}%`, `%${texto}%`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const [rows] = await connection.query(
      `SELECT
         u.id,
         u.nombre,
         u.apellido,
         u.email,
         u.usuario,
         u.tipo,
         u.curso,
         u.estado,
         COALESCE(GROUP_CONCAT(DISTINCT uc.curso ORDER BY uc.curso SEPARATOR ','), '') AS cursos
       FROM Usuario u
       LEFT JOIN UsuarioCurso uc ON uc.usuario_id = u.id
       ${where}
      GROUP BY u.id, u.nombre, u.apellido, u.email, u.usuario, u.tipo, u.curso, u.estado
       ORDER BY u.id DESC`,
      params
    );

    return rows.map((row) => ({
      ...row,
      cursos: row.cursos ? row.cursos.split(',').filter(Boolean) : (row.curso ? [row.curso] : [])
    }));
  } finally {
    connection.release();
  }
};

const obtenerResumenCursosAdmin = async () => {
  const connection = await conexion.getConnection();

  try {
    const [rows] = await connection.query(
      `SELECT
         uc.curso,
         COUNT(DISTINCT uc.usuario_id) AS alumnos,
         COUNT(DISTINCT t.id) AS tareas,
         COUNT(DISTINCT e.id) AS evaluaciones
       FROM UsuarioCurso uc
       JOIN Usuario u ON u.id = uc.usuario_id AND u.tipo = 'alumno'
       LEFT JOIN Tarea t ON t.curso = uc.curso
       LEFT JOIN Evaluacion e ON e.curso = uc.curso
       GROUP BY uc.curso
       ORDER BY uc.curso ASC`
    );

    return rows;
  } finally {
    connection.release();
  }
};

const listarTareasProfesorAdmin = async (profesorUsuario) => {
  const connection = await conexion.getConnection();

  try {
    const [rows] = await connection.query(
      `SELECT id, titulo, descripcion, curso, profesor_usuario, fecha_vencimiento, creada_en
       FROM Tarea
       WHERE profesor_usuario = ?
       ORDER BY id DESC`,
      [profesorUsuario]
    );

    return rows;
  } finally {
    connection.release();
  }
};

const listarEvaluacionesProfesorAdmin = async (profesorUsuario) => {
  const connection = await conexion.getConnection();

  try {
    const [rows] = await connection.query(
      `SELECT id, titulo, curso, creado_por, max_preguntas
       FROM Evaluacion
       WHERE creado_por = ?
       ORDER BY id DESC`,
      [profesorUsuario]
    );

    return rows;
  } finally {
    connection.release();
  }
};

const cambiarRolUsuarioAdmin = async ({ usuarioObjetivo, nuevoRol }) => {
  if (!ROLES_VALIDOS.includes(nuevoRol)) {
    return { ok: false, code: 'ROL_INVALIDO' };
  }

  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const usuario = await obtenerUsuarioPorNombre(connection, usuarioObjetivo);
    if (!usuario) {
      await connection.rollback();
      return { ok: false, code: 'USUARIO_NO_ENCONTRADO' };
    }

    if (usuario.tipo === 'admin' && nuevoRol !== 'admin') {
      const totalAdminsActivos = await contarAdminsActivos(connection);
      if (totalAdminsActivos <= 1 && usuario.estado === 'activo') {
        await connection.rollback();
        return { ok: false, code: 'ULTIMO_ADMIN_ACTIVO' };
      }
    }

    const [result] = await connection.query(
      'UPDATE Usuario SET tipo = ? WHERE usuario = ?',
      [nuevoRol, usuarioObjetivo]
    );

    await connection.commit();
    return {
      ok: true,
      affectedRows: result.affectedRows,
      usuario: usuarioObjetivo,
      rolAnterior: usuario.tipo,
      rolNuevo: nuevoRol
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const actualizarCursoUsuarioAdmin = async ({ usuarioObjetivo, cursos }) => {
  const cursosNormalizados = normalizarCursosEntrada(cursos);
  const cursoInvalido = cursosNormalizados.find((curso) => !CURSOS_VALIDOS.includes(curso));

  if (cursoInvalido) {
    return { ok: false, code: 'CURSO_INVALIDO' };
  }

  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const usuario = await obtenerUsuarioPorNombre(connection, usuarioObjetivo);
    if (!usuario) {
      await connection.rollback();
      return { ok: false, code: 'USUARIO_NO_ENCONTRADO' };
    }

    if (usuario.tipo !== 'alumno') {
      await connection.rollback();
      return { ok: false, code: 'SOLO_ALUMNO' };
    }

    const cursosAnteriores = await obtenerCursosAlumnoPorId(connection, usuario.id, usuario.curso);

    await connection.query(
      'DELETE FROM UsuarioCurso WHERE usuario_id = ?',
      [usuario.id]
    );

    for (const curso of cursosNormalizados) {
      await connection.query(
        'INSERT INTO UsuarioCurso (usuario_id, curso) VALUES (?, ?)',
        [usuario.id, curso]
      );
    }

    const [result] = await connection.query(
      'UPDATE Usuario SET curso = ? WHERE usuario = ?',
      [cursosNormalizados[0] || null, usuarioObjetivo]
    );

    await connection.commit();

    return {
      ok: true,
      affectedRows: result.affectedRows,
      usuario: usuarioObjetivo,
      cursosAnteriores,
      cursosNuevos: cursosNormalizados,
      cursoPrincipal: cursosNormalizados[0] || null
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const actualizarEstadoUsuarioAdmin = async ({ usuarioObjetivo, nuevoEstado }) => {
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return { ok: false, code: 'ESTADO_INVALIDO' };
  }

  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const usuario = await obtenerUsuarioPorNombre(connection, usuarioObjetivo);
    if (!usuario) {
      await connection.rollback();
      return { ok: false, code: 'USUARIO_NO_ENCONTRADO' };
    }

    if (usuario.tipo === 'admin' && usuario.estado === 'activo' && nuevoEstado !== 'activo') {
      const totalAdminsActivos = await contarAdminsActivos(connection);
      if (totalAdminsActivos <= 1) {
        await connection.rollback();
        return { ok: false, code: 'ULTIMO_ADMIN_ACTIVO' };
      }
    }

    const [result] = await connection.query(
      'UPDATE Usuario SET estado = ? WHERE usuario = ?',
      [nuevoEstado, usuarioObjetivo]
    );

    await connection.commit();
    return {
      ok: true,
      affectedRows: result.affectedRows,
      usuario: usuarioObjetivo,
      estadoAnterior: usuario.estado,
      estadoNuevo: nuevoEstado
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export {
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
};
