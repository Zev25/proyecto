import { conexion } from '../db.js';

const buscarUsuarioPorUsuario = async (usuarioBuscado = '') => {
    const connection = await conexion.getConnection();

    try {
        const [rows] = await connection.query(
            'SELECT id, nombre, apellido, email, usuario, tipo, curso, estado FROM Usuario WHERE usuario LIKE ? ORDER BY usuario ASC',
            [`%${usuarioBuscado}%`]
        );
        return rows;
    } finally {
        connection.release();
    }
};

export { buscarUsuarioPorUsuario };