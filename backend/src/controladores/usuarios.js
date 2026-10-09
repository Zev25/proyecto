import { conexion } from '../db.js';

/**
 * Crear Usuario
 * @param {Object} req - La solicitud HTTP
 * @param {Object} res - La respuesta HTTP
 */

const crearUsuario = async (datos) => {
    const { nombre, apellido, email, usuario, contrasena, tipo, curso, cursos } = datos;
    const connection = await conexion.getConnection();
    try {
        await connection.beginTransaction();

        const cursosNormalizados = Array.isArray(cursos)
            ? [...new Set(cursos.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))]
            : [];

        const cursoPrincipal = tipo === 'alumno'
            ? (cursosNormalizados[0] || curso || null)
            : null;

        const [result] = await connection.query(
            `INSERT INTO Usuario (nombre, apellido, email, usuario, contrasena, tipo, curso, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'activo')`,
            [nombre, apellido, email, usuario, contrasena, tipo, cursoPrincipal]
        );

        if (tipo === 'alumno') {
            const cursosAInsertar = cursosNormalizados.length > 0
                ? cursosNormalizados
                : (cursoPrincipal ? [cursoPrincipal] : []);

            for (const cursoAlumno of cursosAInsertar) {
                await connection.query(
                    'INSERT INTO UsuarioCurso (usuario_id, curso) VALUES (?, ?)',
                    [result.insertId, cursoAlumno]
                );
            }
        }

        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Obtener todos los usuarios
 * @returns {Promise<Array>} - Lista de usuarios
 */
const obtenerUsuarios = async () => {
    const connection = await conexion.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT id, nombre, apellido, email, usuario, tipo, curso, estado FROM Usuario ORDER BY id DESC'
        );
        return rows;
    } finally {
        connection.release();
    }
};

/**
 * Obtener un usuario por ID
 * @param {number} id - ID del usuario
 * @returns {Promise<Object|null>} - Usuario encontrado o null
 */
const obtenerUsuarioPorId = async (id) => {
    const connection = await conexion.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT id, nombre, apellido, email, usuario, tipo, curso, estado FROM Usuario WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    } finally {
        connection.release();
    }
};

/**
 * Borrar un usuario por ID
 * @param {number} id - ID del usuario
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
const borrarUsuario = async (id) => {
    const connection = await conexion.getConnection();
    try {
        const [result] = await connection.query(
            'DELETE FROM Usuario WHERE id = ?',
            [id]
        );
        return result;
    } finally {
        connection.release();
    }
};

/**
 * Actualizar un usuario por ID
 * @param {number} id - ID del usuario
 * @param {Object} datos - Campos a actualizar (ej: { nombre, apellido, usuario, contrasena, tipo })
 * @returns {Promise<Object>} - Resultado de la actualización
 */
const actualizarUsuario = async (id, datos) => {
    const connection = await conexion.getConnection();
    try {
        const keys = Object.keys(datos);
        const setClause = keys.map((key) => `${key} = ?`).join(', ');
        const values = keys.map((key) => datos[key]);
        values.push(id);

        const query = `UPDATE Usuario SET ${setClause} WHERE id = ?`;
        const [result] = await connection.query(query, values);
        return result;
    } finally {
        connection.release();
    }
};

export {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    borrarUsuario,
    actualizarUsuario
};
