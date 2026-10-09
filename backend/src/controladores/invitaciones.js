import crypto from 'crypto';
import { conexion } from '../db.js';
import { CURSOS_VALIDOS } from './adminPanel.js';

const DIGITOS_CODIGO = 8;

const normalizarCursos = (entrada) => {
  const lista = Array.isArray(entrada) ? entrada : [];
  const cursos = lista
    .map((curso) => (typeof curso === 'string' ? curso.trim() : ''))
    .filter(Boolean);

  return [...new Set(cursos)];
};

const generarCodigoNumerico = () => {
  let codigo = '';
  for (let i = 0; i < DIGITOS_CODIGO; i += 1) {
    codigo += crypto.randomInt(0, 10).toString();
  }
  return codigo;
};

const hashCodigo = (codigo) => {
  return crypto.createHash('sha256').update(String(codigo)).digest('hex');
};

const calcularExpiracion = (expiraEnHoras) => {
  const horas = Number(expiraEnHoras || 24);
  const horasSeguras = Number.isFinite(horas) && horas > 0 ? horas : 24;
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + horasSeguras);
  return fecha;
};

const obtenerCursosAlumno = async (connection, usuario) => {
  const [usuarioRows] = await connection.query(
    'SELECT id, curso, estado FROM Usuario WHERE usuario = ? AND tipo = \'alumno\' LIMIT 1',
    [usuario]
  );

  const alumno = usuarioRows[0];
  if (!alumno) {
    return { ok: false, code: 'ALUMNO_NO_ENCONTRADO' };
  }

  if (alumno.estado && alumno.estado !== 'activo') {
    return { ok: false, code: 'ALUMNO_NO_ACTIVO' };
  }

  const [rows] = await connection.query(
    'SELECT curso FROM UsuarioCurso WHERE usuario_id = ? ORDER BY curso ASC',
    [alumno.id]
  );

  const cursos = rows.map((row) => row.curso).filter(Boolean);
  const cursosFinales = cursos.length > 0 ? cursos : (alumno.curso ? [alumno.curso] : []);

  return {
    ok: true,
    alumnoId: alumno.id,
    cursos: cursosFinales
  };
};

const crearInvitacionCursoAdmin = async ({ adminUsuario, cursos, expiraEnHoras, cupoMaximo }) => {
  const cursosNormalizados = normalizarCursos(cursos);

  if (cursosNormalizados.length === 0) {
    return { ok: false, code: 'CURSOS_REQUERIDOS' };
  }

  const cursoInvalido = cursosNormalizados.find((curso) => !CURSOS_VALIDOS.includes(curso));
  if (cursoInvalido) {
    return { ok: false, code: 'CURSO_INVALIDO' };
  }

  const cupo = Number(cupoMaximo || 1);
  const cupoSeguro = Number.isInteger(cupo) && cupo > 0 ? cupo : 1;
  const expiraEn = calcularExpiracion(expiraEnHoras);

  const connection = await conexion.getConnection();

  try {
    for (let intento = 0; intento < 5; intento += 1) {
      const codigo = generarCodigoNumerico();
      const codigoHash = hashCodigo(codigo);

      try {
        const [result] = await connection.query(
          `INSERT INTO InvitacionCurso
            (codigo_hash, codigo_ultimos4, cursos_json, creado_por, expira_en, cupo_maximo, usos_actuales, activa)
           VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
          [
            codigoHash,
            codigo.slice(-4),
            JSON.stringify(cursosNormalizados),
            adminUsuario || null,
            expiraEn,
            cupoSeguro
          ]
        );

        return {
          ok: true,
          codigo,
          data: {
            invitacionId: result.insertId,
            cursos: cursosNormalizados,
            expiraEn,
            cupoMaximo: cupoSeguro,
            creadoPor: adminUsuario || null
          }
        };
      } catch (error) {
        if (error && error.code === 'ER_DUP_ENTRY') {
          continue;
        }
        throw error;
      }
    }

    return { ok: false, code: 'NO_SE_PUDO_GENERAR_CODIGO' };
  } finally {
    connection.release();
  }
};

const canjearInvitacionCursoAlumno = async ({ alumnoUsuario, codigo }) => {
  const codigoPlano = String(codigo || '').trim();
  if (!/^\d{8}$/.test(codigoPlano)) {
    return { ok: false, code: 'CODIGO_INVALIDO' };
  }

  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();

    const codigoHash = hashCodigo(codigoPlano);
    const [invRows] = await connection.query(
      `SELECT id, cursos_json, expira_en, cupo_maximo, usos_actuales, activa
       FROM InvitacionCurso
       WHERE codigo_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [codigoHash]
    );

    const invitacion = invRows[0];

    if (!invitacion || Number(invitacion.activa) !== 1) {
      await connection.rollback();
      return { ok: false, code: 'CODIGO_INVALIDO' };
    }

    if (new Date(invitacion.expira_en).getTime() < Date.now()) {
      await connection.rollback();
      return { ok: false, code: 'CODIGO_EXPIRADO' };
    }

    if (Number(invitacion.usos_actuales) >= Number(invitacion.cupo_maximo)) {
      await connection.rollback();
      return { ok: false, code: 'SIN_CUPOS' };
    }

    const cursosInvitacion = normalizarCursos(JSON.parse(invitacion.cursos_json || '[]'));
    if (cursosInvitacion.length === 0) {
      await connection.rollback();
      return { ok: false, code: 'INVITACION_SIN_CURSOS' };
    }

    const alumnoInfo = await obtenerCursosAlumno(connection, alumnoUsuario);
    if (!alumnoInfo.ok) {
      await connection.rollback();
      return alumnoInfo;
    }

    const [canjeRows] = await connection.query(
      'SELECT id FROM InvitacionCursoCanje WHERE invitacion_id = ? AND alumno_usuario = ? LIMIT 1',
      [invitacion.id, alumnoUsuario]
    );

    if (canjeRows[0]) {
      await connection.rollback();
      return { ok: false, code: 'YA_CANJEADO' };
    }

    const cursosActualesSet = new Set(alumnoInfo.cursos);
    const cursosNuevos = cursosInvitacion.filter((curso) => !cursosActualesSet.has(curso));

    if (cursosNuevos.length === 0) {
      await connection.rollback();
      return { ok: false, code: 'YA_INSCRITO' };
    }

    for (const curso of cursosNuevos) {
      await connection.query(
        'INSERT IGNORE INTO UsuarioCurso (usuario_id, curso) VALUES (?, ?)',
        [alumnoInfo.alumnoId, curso]
      );
    }

    const cursosFinales = [...new Set([...alumnoInfo.cursos, ...cursosNuevos])];

    await connection.query(
      'UPDATE Usuario SET curso = ? WHERE id = ?',
      [cursosFinales[0] || null, alumnoInfo.alumnoId]
    );

    await connection.query(
      'INSERT INTO InvitacionCursoCanje (invitacion_id, alumno_usuario) VALUES (?, ?)',
      [invitacion.id, alumnoUsuario]
    );

    await connection.query(
      `UPDATE InvitacionCurso
       SET usos_actuales = usos_actuales + 1
       WHERE id = ?`,
      [invitacion.id]
    );

    await connection.query(
      `UPDATE InvitacionCurso
       SET activa = CASE WHEN usos_actuales >= cupo_maximo THEN 0 ELSE 1 END
       WHERE id = ?`,
      [invitacion.id]
    );

    await connection.commit();

    return {
      ok: true,
      data: {
        invitacionId: invitacion.id,
        alumnoUsuario,
        cursosAgregados: cursosNuevos,
        cursosTotales: cursosFinales
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export {
  crearInvitacionCursoAdmin,
  canjearInvitacionCursoAlumno
};
