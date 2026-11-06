import {
  asignarProfesorAClase,
  crearOfertaAcademica,
  listarOfertasAcademicas,
  listarOfertasAlumno
} from './ofertas.js';

const listarOfertasAdminControlador = async (_req, res) => {
  try {
    const data = await listarOfertasAcademicas();
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar las ofertas', message: error.message });
  }
};

const asignarProfesorClaseControlador = async (req, res) => {
  try {
    const result = await asignarProfesorAClase({
      claseId: req.params.claseId,
      profesorUsuario: req.body?.profesorUsuario ?? null
    });
    if (!result.ok) {
      const errores = {
        CLASE_INVALIDA: 'La clase indicada no es válida',
        CLASE_NO_ENCONTRADA: 'No se encontró la clase',
        PROFESOR_INVALIDO: 'El profesor indicado no es válido',
        PROFESOR_NO_ENCONTRADO: 'Selecciona un profesor activo'
      };
      return res.status(400).json({ ok: false, error: errores[result.code] || 'No se pudo asignar el profesor', code: result.code });
    }
    return res.json({ ok: true, message: 'Asignación actualizada' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar la asignación', message: error.message });
  }
};

const listarOfertasProfesorControlador = async (req, res) => {
  try {
    const profesorUsuario = req.headers['x-user-name'];
    if (!profesorUsuario) return res.status(400).json({ ok: false, error: 'Falta identificar al profesor' });
    const data = await listarOfertasAcademicas({ profesorUsuario });
    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'No se pudieron listar las ofertas', message: error.message });
  }
};

const crearOfertaControlador = async (req, res) => {
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
};

const listarOfertasAlumnoControlador = async (req, res) => {
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
};

export {
  listarOfertasAdminControlador,
  asignarProfesorClaseControlador,
  listarOfertasProfesorControlador,
  crearOfertaControlador,
  listarOfertasAlumnoControlador
};
