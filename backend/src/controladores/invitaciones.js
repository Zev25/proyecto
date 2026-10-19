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

const normalizarOfertaIds = (entrada) => {
  if (!Array.isArray(entrada)) return [];
  const ids = entrada.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
};

const obtenerOfertasActivas = async (connection, ofertaIds, bloquear = false) => {
  if (ofertaIds.length === 0) return [];
  const placeholders = ofertaIds.map(() => '?').join(', ');
  const [rows] = await connection.query(
    `SELECT o.id, o.turno, o.cupo_maximo, c.nombre AS curso
     FROM OfertaCurso o
     JOIN Curso c ON c.id = o.curso_id
     WHERE o.id IN (${placeholders}) AND o.activa = 1 AND c.activo = 1
     ORDER BY o.id ASC${bloquear ? ' FOR UPDATE' : ''}`,
    ofertaIds
  );
  return rows;
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

const crearInvitacionCursoAdmin = async ({ adminUsuario, cursos, ofertaIds, expiraEnHoras, cupoMaximo }) => {
  const cursosNormalizados = normalizarCursos(cursos);
  const ofertaIdsNormalizados = normalizarOfertaIds(ofertaIds);

  if (cursosNormalizados.length === 0 && ofertaIdsNormalizados.length === 0) {
    return { ok: false, code: 'CURSOS_O_OFERTAS_REQUERIDOS' };
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
    const ofertas = await obtenerOfertasActivas(connection, ofertaIdsNormalizados);
    if (ofertas.length !== ofertaIdsNormalizados.length) {
      return { ok: false, code: 'OFERTAS_INVALIDAS' };
    }

    for (let intento = 0; intento < 5; intento += 1) {
      const codigo = generarCodigoNumerico();
      const codigoHash = hashCodigo(codigo);

      try {
        const [result] = await connection.query(
          `INSERT INTO InvitacionCurso
            (codigo_hash, codigo_ultimos4, cursos_json, oferta_ids_json, creado_por, expira_en, cupo_maximo, usos_actuales, activa)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
          [
            codigoHash,
            codigo.slice(-4),
            JSON.stringify(cursosNormalizados),
            JSON.stringify(ofertaIdsNormalizados),
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
            ofertaIds: ofertaIdsNormalizados,
            ofertas: ofertas.map((oferta) => ({ id: oferta.id, curso: oferta.curso, turno: oferta.turno })),
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
      `SELECT id, cursos_json, oferta_ids_json, expira_en, cupo_maximo, usos_actuales, activa
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
    const ofertaIdsInvitacion = normalizarOfertaIds(JSON.parse(invitacion.oferta_ids_json || '[]'));
    if (cursosInvitacion.length === 0 && ofertaIdsInvitacion.length === 0) {
      await connection.rollback();
      return { ok: false, code: 'INVITACION_SIN_DESTINOS' };
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
    const ofertasInvitacion = await obtenerOfertasActivas(connection, ofertaIdsInvitacion, true);
    if (ofertasInvitacion.length !== ofertaIdsInvitacion.length) {
      await connection.rollback();
      return { ok: false, code: 'OFERTA_INVALIDA' };
    }

    let ofertasYaMatriculadas = [];
    if (ofertaIdsInvitacion.length > 0) {
      const placeholders = ofertaIdsInvitacion.map(() => '?').join(', ');
      const [matriculas] = await connection.query(
        `SELECT oferta_id FROM MatriculaOferta
         WHERE usuario_id = ? AND oferta_id IN (${placeholders})`,
        [alumnoInfo.alumnoId, ...ofertaIdsInvitacion]
      );
      ofertasYaMatriculadas = matriculas.map((matricula) => Number(matricula.oferta_id));
    }
    const ofertasYaMatriculadasSet = new Set(ofertasYaMatriculadas);
    const ofertasNuevas = ofertasInvitacion.filter((oferta) => !ofertasYaMatriculadasSet.has(Number(oferta.id)));

    if (cursosNuevos.length === 0 && ofertasNuevas.length === 0) {
      await connection.rollback();
      return { ok: false, code: 'YA_INSCRITO' };
    }

    for (const oferta of ofertasNuevas) {
      const [[conteo]] = await connection.query(
        'SELECT COUNT(*) AS total FROM MatriculaOferta WHERE oferta_id = ?',
        [oferta.id]
      );
      if (Number(conteo.total || 0) >= Number(oferta.cupo_maximo)) {
        await connection.rollback();
        return { ok: false, code: 'OFERTA_SIN_CUPOS', curso: oferta.curso, turno: oferta.turno };
      }
    }

    for (const oferta of ofertasNuevas) {
      await connection.query(
        'INSERT INTO MatriculaOferta (usuario_id, oferta_id) VALUES (?, ?)',
        [alumnoInfo.alumnoId, oferta.id]
      );

      const cursosLegacyAgregados = new Set(cursosNuevos);
      const [clasesLegacy] = await connection.query(
        `SELECT DISTINCT codigo_legacy
         FROM Clase
         WHERE oferta_id = ? AND codigo_legacy IS NOT NULL AND TRIM(codigo_legacy) <> ''`,
        [oferta.id]
      );
      for (const clase of clasesLegacy) {
        if (!cursosActualesSet.has(clase.codigo_legacy) && !cursosLegacyAgregados.has(clase.codigo_legacy)) {
          cursosNuevos.push(clase.codigo_legacy);
          cursosLegacyAgregados.add(clase.codigo_legacy);
        }
      }
    }

    for (const curso of new Set(cursosNuevos)) {
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
        cursosTotales: cursosFinales,
        ofertasMatriculadas: ofertasNuevas.map((oferta) => Number(oferta.id))
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
