import { conexion } from '../../db.js';

const raizControlador = (req, res) => {
  res.json({ ok: true, message: 'API funcionando' });
};

const dbHealthControlador = async (req, res) => {
  try {
    const [rows] = await conexion.query('SELECT 1 + 1 AS result');
    return res.json({ ok:true, dbResult: rows[0].result });
  } catch (error) {
    return res.status(500).json({ ok:false, db:'error', message: error.message });
  }
};

const panelAlumnoControlador = (req, res) => {
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
};

const panelProfesorControlador = (req, res) => {
  return res.json({
    ok: true,
    message: 'Bienvenido al panel de profesor'
  });
};

const panelAdminControlador = (req, res) => {
  return res.json({
    ok: true,
    message: 'Bienvenido al panel de administrador'
  });
};

export {
  raizControlador,
  dbHealthControlador,
  panelAlumnoControlador,
  panelProfesorControlador,
  panelAdminControlador
};
