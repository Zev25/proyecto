import { CURSOS_VALIDOS } from '../admin/constantes.js';
import { canjearInvitacionCursoAlumno, crearInvitacionCursoAdmin } from './invitaciones.js';

const crearInvitacionControlador = async (req, res) => {
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
      if (result.code === 'CUPO_INVALIDO') {
        return res.status(400).json({ ok: false, error: 'El número de usos debe ser un entero entre 1 y 1000' });
      }
      if (result.code === 'CUPO_SUPERA_DISPONIBLES') {
        return res.status(409).json({
          ok: false,
          error: `La oferta ${result.curso} · ${result.turno} solo tiene ${result.disponibles} cupos disponibles`
        });
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
};

const canjearInvitacionControlador = async (req, res) => {
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
};

export { crearInvitacionControlador, canjearInvitacionControlador };
