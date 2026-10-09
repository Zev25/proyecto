import { conexion } from '../db.js';

const crearTarea = async ({ titulo, descripcion, curso, profesorUsuario, fechaVencimiento }) => {
  const connection = await conexion.getConnection();

  try {
    const [result] = await connection.query(
      `INSERT INTO Tarea (titulo, descripcion, curso, profesor_usuario, fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?)`,
      [titulo, descripcion, curso, profesorUsuario, fechaVencimiento || null]
    );

    return result;
  } finally {
    connection.release();
  }
};

const listarTareasPorCurso = async (curso) => {
  const connection = await conexion.getConnection();

  try {
    const [rows] = await connection.query(
      `SELECT id, titulo, descripcion, curso, profesor_usuario, fecha_vencimiento, creada_en
       FROM Tarea
       WHERE curso = ?
       ORDER BY id DESC`,
      [curso]
    );

    return rows;
  } finally {
    connection.release();
  }
};

const listarTareasPorProfesor = async (profesorUsuario) => {
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

export { crearTarea, listarTareasPorCurso, listarTareasPorProfesor };
