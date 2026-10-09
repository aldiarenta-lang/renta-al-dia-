import {
  authenticate,
  changePassword,
  clearSessionCookie,
  login,
  logout,
  registerCompany,
  resetPassword,
  sendPasswordReset,
  sessionInfo,
  sessionInfoForLogin
} from '../services/auth-service.js';
import { pool } from '../db/pool.js';

export async function signIn(req, res) {
  try {
    const user = await login(pool, req, res);
    return res.json(await sessionInfoForLogin(pool, user));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo iniciar sesión:', error);
    clearSessionCookie(res);
    return res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
}

export async function signUp(req, res) {
  try {
    const result = await registerCompany(pool, req.body, res);
    return res.status(201).json({ user: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo registrar la empresa:', error);
    clearSessionCookie(res);
    return res.status(500).json({ error: 'No se pudo registrar la empresa.' });
  }
}

export async function currentSession(req, res) {
  try {
    return await sessionInfo(pool, req, res);
  } catch (error) {
    console.error('No se pudo cargar el perfil de usuario:', error);
    return res.status(500).json({ error: 'No se pudo cargar la sesión.' });
  }
}

export async function signOut(req, res) {
  try {
    return await logout(pool, req, res);
  } catch (error) {
    console.error('No se pudo cerrar la sesión:', error);
    return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
  }
}

export async function updatePassword(req, res) {
  try {
    const csrfToken = await changePassword(pool, req.auth.userId, req.body?.currentPassword, req.body?.password, res);
    return res.json({ csrfToken });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo cambiar la contraseña:', error);
    return res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
  }
}

export async function requestPasswordReset(req, res) {
  try {
    await sendPasswordReset(pool, req.body?.email);
    return res.json({ message: 'Si la cuenta existe, recibirás un enlace para recuperar la contraseña.' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo enviar el enlace para recuperar la contraseña:', error);
    return res.status(503).json({ error: 'No se pudo enviar el enlace de recuperación.' });
  }
}

export async function completePasswordReset(req, res) {
  try {
    await resetPassword(pool, req.body?.token, req.body?.password);
    return res.status(204).end();
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo completar el cambio de contraseña:', error);
    return res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
  }
}

export const requireAuth = (req, res, next) => authenticate(pool, req, res, next);
