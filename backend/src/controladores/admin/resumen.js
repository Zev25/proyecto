import { conexion } from '../../db.js';

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

export { obtenerResumenAdmin, obtenerResumenCursosAdmin };
