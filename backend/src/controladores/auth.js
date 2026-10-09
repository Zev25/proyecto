import  { conexion } from '../db.js';

const loginUsuario = async ({ usuario, contrasena}) => {
    const connection = await conexion.getConnection();

    try {
        const [rows] = await connection.query(
            'SELECT id, nombre, apellido, email, usuario, tipo, curso, estado, contrasena FROM Usuario WHERE usuario = ? LIMIT 1',
            [usuario]
        );

        const user = rows[0];
        if (!user) {
            return { ok: false, code: 'USUARIO_NO_ENCONTRADO' };
        }

        if (user.contrasena !== contrasena) {
            return { ok: false, code: 'CREDENCIALES_INVALIDAS' };
        }

        if (user.estado && user.estado !== 'activo') {
            return {
                ok: false,
                code: 'USUARIO_NO_ACTIVO',
                estado: user.estado
            };
        }

        const [cursosRows] = await connection.query(
            'SELECT curso FROM UsuarioCurso WHERE usuario_id = ? ORDER BY curso ASC',
            [user.id]
        );

        const cursos = cursosRows.map((row) => row.curso).filter(Boolean);
        const cursosFinales = cursos.length > 0 ? cursos : (user.curso ? [user.curso] : []);

        return {
            ok: true,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                usuario: user.usuario,
                tipo: user.tipo,
                curso: cursosFinales[0] || null,
                cursos: cursosFinales,
                estado: user.estado || 'activo'
            }
        };
    } finally {
        connection.release();
    }
}

export { loginUsuario };