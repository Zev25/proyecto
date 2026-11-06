import { conexion } from '../../db.js';

const listarEvaluacionesDisponibles = async (cursos = null) => {
  const connection = await conexion.getConnection();

  try {
    if (Array.isArray(cursos) && cursos.length === 0) {
      return [];
    }

    const cursosArray = Array.isArray(cursos)
      ? cursos.filter((curso) => typeof curso === 'string' && curso.trim())
      : [];

    const whereCursos = cursosArray.length > 0
      ? `WHERE curso IN (${cursosArray.map(() => '?').join(', ')})`
      : '';

    const [evaluaciones] = await connection.query(
      `SELECT id, titulo, curso, creado_por, max_preguntas, preguntas_por_intento, categoria
       FROM Evaluacion
       ${whereCursos ? `${whereCursos} AND publicada = 1` : 'WHERE publicada = 1'}
       ORDER BY id DESC`,
      cursosArray
    );

    return evaluaciones;
  } finally {
    connection.release();
  }
};

export { listarEvaluacionesDisponibles };
