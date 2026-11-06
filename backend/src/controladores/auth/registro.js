import { crearUsuario } from '../usuarios/usuarios.js';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registrarUsuario = async ({ nombre, apellido, email, usuario, contrasena, tipo, curso, cursos }) => {
  if (!nombre || !apellido || !email || !usuario || !contrasena || !tipo) {
    return { ok: false, code: 'DATOS_INCOMPLETOS' };
  }

  const emailNormalizado = String(email).trim().toLowerCase();
  if (emailNormalizado.length > 191 || !EMAIL_VALIDO.test(emailNormalizado)) {
    return { ok: false, code: 'EMAIL_INVALIDO' };
  }

  const cursosAlumno = Array.isArray(cursos)
    ? cursos.filter((item) => typeof item === 'string' && item.trim())
    : [];

  const cursoPrincipal = tipo === 'alumno'
    ? (cursosAlumno[0] || curso || null)
    : null;

  let result;
  try {
    result = await crearUsuario({
      nombre,
      apellido,
      email: emailNormalizado,
      usuario,
      contrasena,
      tipo,
      curso: cursoPrincipal,
      cursos: tipo === 'alumno' ? cursosAlumno : []
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return { ok: false, code: 'USUARIO_DUPLICADO' };
    throw error;
  }

  return {
    ok: true,
    insertId: result.insertId,
    data: {
      nombre,
      apellido,
      email: emailNormalizado,
      usuario,
      tipo,
      curso: cursoPrincipal,
      cursos: tipo === 'alumno' ? (cursosAlumno.length > 0 ? cursosAlumno : (cursoPrincipal ? [cursoPrincipal] : [])) : []
    }
  };
};

export { registrarUsuario };
