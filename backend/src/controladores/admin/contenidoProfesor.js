import { conexion } from '../../db.js';

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

export { listarTareasProfesorAdmin, listarEvaluacionesProfesorAdmin };
