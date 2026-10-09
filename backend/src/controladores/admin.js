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

const asignarRolProfesor = async (usuarioBuscado) => {
    const connection = await conexion.getConnection();

    try {
        const [result] = await connection.query(
            `UPDATE Usuario SET tipo = 'profesor' WHERE usuario = ? AND tipo <> 'admin'`,
            [usuarioBuscado]
        );
        return result;
    } finally {
        connection.release();
    }
};

export { buscarUsuarioPorUsuario, asignarRolProfesor };