import { conexion } from '../db.js';

const MODALIDADES_VALIDAS = new Set(['semanal', 'entregas']);
const horaValida = (valor) => typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);

const normalizarClase = (clase) => ({
  materia: typeof clase?.materia === 'string' ? clase.materia.trim() : '',
  nombre: typeof clase?.nombre === 'string' ? clase.nombre.trim() : '',
  modalidad: clase?.modalidad || 'semanal',
  horario: typeof clase?.horario === 'string' ? clase.horario.trim() : null,
  codigoLegacy: typeof clase?.codigoLegacy === 'string' ? clase.codigoLegacy.trim() : null
});

const validarOferta = ({ curso, turno, horaInicio, horaFin, cupoMaximo, clases }) => {
  if (typeof curso !== 'string' || !curso.trim()) return 'CURSO_REQUERIDO';
  if (typeof turno !== 'string' || !turno.trim()) return 'TURNO_REQUERIDO';
  if (!horaValida(horaInicio) || !horaValida(horaFin) || horaInicio >= horaFin) return 'HORARIO_INVALIDO';
  if (!Number.isInteger(Number(cupoMaximo)) || Number(cupoMaximo) < 1 || Number(cupoMaximo) > 10000) return 'CUPO_INVALIDO';
  if (!Array.isArray(clases) || clases.length === 0 || clases.length > 50) return 'CLASES_INVALIDAS';

  const clasesNormalizadas = clases.map(normalizarClase);
  const claseInvalida = clasesNormalizadas.some((clase) => (
    !clase.materia
    || !clase.nombre
    || clase.materia.length > 100
    || clase.nombre.length > 100
    || !MODALIDADES_VALIDAS.has(clase.modalidad)
    || (clase.modalidad === 'semanal' && !clase.horario)
    || (clase.horario && clase.horario.length > 150)
    || (clase.codigoLegacy && clase.codigoLegacy.length > 100)
  ));
  if (claseInvalida) return 'CLASE_INVALIDA';

  if (new Set(clasesNormalizadas.map((clase) => clase.nombre)).size !== clasesNormalizadas.length) {
    return 'CLASE_DUPLICADA';
  }

  return null;
};

const listarOfertasAcademicas = async ({ incluirInactivas = false } = {}) => {
  const connection = await conexion.getConnection();

  try {
    const [ofertas] = await connection.query(
      `SELECT o.id, c.nombre AS curso, o.turno,
              TIME_FORMAT(o.hora_inicio, '%H:%i') AS hora_inicio,
              TIME_FORMAT(o.hora_fin, '%H:%i') AS hora_fin,
              o.cupo_maximo, o.activa,
              (SELECT COUNT(*) FROM MatriculaOferta m WHERE m.oferta_id = o.id) AS inscritos
       FROM OfertaCurso o
       JOIN Curso c ON c.id = o.curso_id
       ${incluirInactivas ? '' : 'WHERE o.activa = 1 AND c.activo = 1'}
       ORDER BY c.nombre ASC, o.turno ASC, o.id ASC`
    );

    if (ofertas.length === 0) return [];

    const ids = ofertas.map((oferta) => oferta.id);
    const placeholders = ids.map(() => '?').join(', ');
    const [clases] = await connection.query(
      `SELECT oferta_id, materia, nombre, modalidad, horario, codigo_legacy
       FROM Clase
       WHERE oferta_id IN (${placeholders})
       ORDER BY oferta_id ASC, materia ASC, nombre ASC`,
      ids
    );
    const clasesPorOferta = new Map();

    for (const clase of clases) {
      const lista = clasesPorOferta.get(clase.oferta_id) || [];
      lista.push({
        subject: clase.materia,
        name: clase.nombre,
        mode: clase.modalidad,
        schedule: clase.horario || 'Por entregas',
        legacyCourse: clase.codigo_legacy
      });
      clasesPorOferta.set(clase.oferta_id, lista);
    }

    return ofertas.map((oferta) => ({
      id: oferta.id,
      course: oferta.curso,
      shift: oferta.turno,
      start: oferta.hora_inicio,
      end: oferta.hora_fin,
      capacity: Number(oferta.cupo_maximo),
      enrolled: Number(oferta.inscritos || 0),
      active: Boolean(oferta.activa),
      classes: clasesPorOferta.get(oferta.id) || []
    }));
  } finally {
    connection.release();
  }
};

const crearOfertaAcademica = async ({ curso, turno, horaInicio, horaFin, cupoMaximo, clases }) => {
  const error = validarOferta({ curso, turno, horaInicio, horaFin, cupoMaximo, clases });
  if (error) return { ok: false, code: error };

  const clasesNormalizadas = clases.map(normalizarClase);
  const connection = await conexion.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('INSERT IGNORE INTO Curso (nombre) VALUES (?)', [curso.trim()]);

    const [cursos] = await connection.query(
      'SELECT id FROM Curso WHERE nombre = ? LIMIT 1 FOR UPDATE',
      [curso.trim()]
    );
    const cursoId = cursos[0]?.id;
    if (!cursoId) throw new Error('No se pudo resolver el curso creado');

    const [resultadoOferta] = await connection.query(
      `INSERT INTO OfertaCurso (curso_id, turno, hora_inicio, hora_fin, cupo_maximo)
       VALUES (?, ?, ?, ?, ?)`,
      [cursoId, turno.trim(), horaInicio, horaFin, Number(cupoMaximo)]
    );
    const ofertaId = resultadoOferta.insertId;

    for (const clase of clasesNormalizadas) {
      await connection.query(
        `INSERT INTO Clase (oferta_id, materia, nombre, modalidad, horario, codigo_legacy)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ofertaId, clase.materia, clase.nombre, clase.modalidad, clase.modalidad === 'semanal' ? clase.horario : null, clase.codigoLegacy || null]
      );
    }

    await connection.commit();
    return { ok: true, ofertaId };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return { ok: false, code: 'OFERTA_DUPLICADA' };
    throw error;
  } finally {
    connection.release();
  }
};

const listarOfertasAlumno = async (usuario) => {
  const connection = await conexion.getConnection();

  try {
    const [alumnos] = await connection.query(
      "SELECT id, estado FROM Usuario WHERE usuario = ? AND tipo = 'alumno' LIMIT 1",
      [usuario]
    );
    const alumno = alumnos[0];
    if (!alumno) return { ok: false, code: 'ALUMNO_NO_ENCONTRADO' };
    if (alumno.estado !== 'activo') return { ok: false, code: 'ALUMNO_NO_ACTIVO' };

    const [ofertas] = await connection.query(
      `SELECT o.id, c.nombre AS curso, o.turno,
              TIME_FORMAT(o.hora_inicio, '%H:%i') AS hora_inicio,
              TIME_FORMAT(o.hora_fin, '%H:%i') AS hora_fin,
              o.cupo_maximo,
              (SELECT COUNT(*) FROM MatriculaOferta m WHERE m.oferta_id = o.id) AS inscritos
       FROM MatriculaOferta mo
       JOIN OfertaCurso o ON o.id = mo.oferta_id AND o.activa = 1
       JOIN Curso c ON c.id = o.curso_id AND c.activo = 1
       WHERE mo.usuario_id = ?
       ORDER BY c.nombre ASC, o.turno ASC`,
      [alumno.id]
    );

    if (ofertas.length === 0) return { ok: true, ofertas: [] };
    const ids = ofertas.map((oferta) => oferta.id);
    const placeholders = ids.map(() => '?').join(', ');
    const [clases] = await connection.query(
      `SELECT oferta_id, materia, nombre, modalidad, horario, codigo_legacy
       FROM Clase
       WHERE oferta_id IN (${placeholders})
       ORDER BY oferta_id ASC, materia ASC, nombre ASC`,
      ids
    );
    const clasesPorOferta = new Map();
    for (const clase of clases) {
      const lista = clasesPorOferta.get(clase.oferta_id) || [];
      lista.push({
        subject: clase.materia,
        name: clase.nombre,
        mode: clase.modalidad,
        schedule: clase.horario || 'Por entregas',
        legacyCourse: clase.codigo_legacy
      });
      clasesPorOferta.set(clase.oferta_id, lista);
    }

    return {
      ok: true,
      ofertas: ofertas.map((oferta) => ({
        id: oferta.id,
        course: oferta.curso,
        shift: oferta.turno,
        start: oferta.hora_inicio,
        end: oferta.hora_fin,
        capacity: Number(oferta.cupo_maximo),
        enrolled: Number(oferta.inscritos || 0),
        classes: clasesPorOferta.get(oferta.id) || []
      }))
    };
  } finally {
    connection.release();
  }
};

export { crearOfertaAcademica, listarOfertasAcademicas, listarOfertasAlumno };
