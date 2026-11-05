import { conexion } from '../db.js';

const crearTarea = async ({ titulo, descripcion, curso, profesorUsuario, fechaVencimiento }) => {
  const connection = await conexion.getConnection();

  try {
    const [result] = await connection.query(
      `INSERT INTO Tarea (titulo, descripcion, curso, profesor_usuario, fecha_vencimiento, publicada)
       VALUES (?, ?, ?, ?, ?, 0)`,
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
      `SELECT id, titulo, descripcion, curso, profesor_usuario, fecha_vencimiento, creada_en, publicada
       FROM Tarea
       WHERE curso = ?
        AND publicada = 1
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
      `SELECT id, titulo, descripcion, curso, profesor_usuario, fecha_vencimiento, creada_en, publicada
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

const actualizarPublicacionTarea = async ({ tareaId, profesorUsuario, publicada }) => {
  const connection = await conexion.getConnection();

  try {
    const [result] = await connection.query(
      'UPDATE Tarea SET publicada = ? WHERE id = ? AND profesor_usuario = ?',
      [publicada ? 1 : 0, tareaId, profesorUsuario]
    );
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
};

const eliminarTarea = async ({ tareaId, profesorUsuario }) => {
  const connection = await conexion.getConnection();

  try {
    const [result] = await connection.query(
      'DELETE FROM Tarea WHERE id = ? AND profesor_usuario = ?',
      [tareaId, profesorUsuario]
    );
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
};

export { actualizarPublicacionTarea, crearTarea, eliminarTarea, listarTareasPorCurso, listarTareasPorProfesor };
