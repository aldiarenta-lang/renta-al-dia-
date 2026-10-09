import { createHash, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { tenantContext } from '../db/tenant-context.js';

const SESSION_COOKIE = 'rda_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const REMEMBERED_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cookieOptions(maxAge) {
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    `Max-Age=${maxAge}`
  ].join('; ');
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookieOptions(0));
}

function setSessionCookie(res, token, durationMs) {
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    `Max-Age=${durationMs / 1000}`
  ].join('; '));
}

function sessionTokenFromRequest(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)) : '';
}

function matchesToken(left, right) {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function createSession(pool, userId, res, remember = false) {
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');
  const duration = remember ? REMEMBERED_SESSION_DURATION_MS : SESSION_DURATION_MS;
  const expiresAt = new Date(Date.now() + duration);
  await pool.privilegedQuery(
    `INSERT INTO user_sessions (token_hash, user_id, csrf_token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [hash(token), userId, csrfToken, expiresAt]
  );
  setSessionCookie(res, token, duration);
  return csrfToken;
}

export async function bootstrapSuperAdmin(pool) {
  const email = normalizeEmail(process.env.SUPER_ADMIN_EMAIL);
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email && !password) return false;
  if (!email || !password) {
    throw new Error('Configura SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD juntos para crear el Super Administrador inicial.');
  }
  if (password.length < 12) {
    throw new Error('SUPER_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  const existing = await pool.query('SELECT is_super_admin FROM users WHERE email = $1', [email]);
  if (existing.rowCount) {
    if (!existing.rows[0].is_super_admin) {
      throw new Error('SUPER_ADMIN_EMAIL ya pertenece a una cuenta que no es Super Administrador.');
    }
    return false;
  }
  await pool.query(
    `INSERT INTO users (id, email, password_hash, full_name, is_super_admin)
     VALUES ($1, $2, $3, 'Super Administrador', true)`,
    [randomUUID(), email, await bcrypt.hash(password, 12)]
  );
  return true;
}

export async function login(pool, req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== 'string' || password.length > 256) {
    throw Object.assign(new Error('Ingresa un correo y una contraseña válidos.'), { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, password_hash, full_name, active, is_super_admin, failed_login_attempts, locked_until
       FROM users WHERE email = $1 FOR UPDATE`,
      [email]
    );
    const user = result.rows[0];
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      await client.query('COMMIT');
      throw Object.assign(new Error('La cuenta está bloqueada temporalmente. Inténtalo más tarde.'), { status: 423 });
    }
    const passwordMatches = await bcrypt.compare(password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches || !user.active) {
      if (user && user.active) {
        const failedAttempts = Number(user.failed_login_attempts) + 1;
        const lockedUntil = failedAttempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null;
        await client.query(
          `UPDATE users SET failed_login_attempts = $2, locked_until = $3, updated_at = now()
           WHERE id = $1`,
          [user.id, failedAttempts >= MAX_LOGIN_ATTEMPTS ? 0 : failedAttempts, lockedUntil]
        );
      }
      await client.query('COMMIT');
      throw Object.assign(new Error('Correo o contraseña incorrectos, o cuenta bloqueada.'), { status: 401 });
    }
    await client.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1',
      [user.id]
    );
    await client.query('COMMIT');
    const csrfToken = await createSession(pool, user.id, res, req.body?.remember === true || req.body?.remember === 'on');
    return { userId: user.id, fullName: user.full_name, email, isSuperAdmin: user.is_super_admin, csrfToken };
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function registerCompany(pool, input, res) {
  const companyName = String(input?.companyName || '').trim();
  const taxId = String(input?.taxId || '').trim();
  const representative = String(input?.representative || '').trim();
  const email = normalizeEmail(input?.email);
  const phone = String(input?.phone || '').trim();
  const municipality = String(input?.municipality || '').trim();
  const password = input?.password;
  if (!companyName || !taxId || !representative || !email || !phone || !municipality ||
      typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw Object.assign(new Error('Completa todos los datos de empresa y usa una contraseña de al menos 12 caracteres.'), { status: 400 });
  }

  const client = await pool.connect();
  const userId = randomUUID();
  const companyId = randomUUID();
  try {
    await client.query('BEGIN');
    const emailInUse = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
    const taxIdInUse = await client.query('SELECT 1 FROM companies WHERE lower(tax_id) = lower($1)', [taxId]);
    if (emailInUse.rowCount || taxIdInUse.rowCount) {
      throw Object.assign(new Error(emailInUse.rowCount
        ? 'Ya existe una cuenta con ese correo.'
        : 'Ya existe una empresa con ese NIT.'), { status: 409 });
    }
    await client.query(
      `INSERT INTO companies (id, name, tax_id, representative, email, phone, municipality)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [companyId, companyName, taxId, representative, email, phone, municipality]
    );
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)`,
      [userId, email, await bcrypt.hash(password, 12), representative]
    );
    await client.query(
      `INSERT INTO company_memberships (user_id, company_id, role_id)
       VALUES ($1, $2, 'company_admin')`,
      [userId, companyId]
    );
    await client.query('COMMIT');
    const csrfToken = await createSession(pool, userId, res);
    return { userId, fullName: representative, email, isSuperAdmin: false, companyId, companyName, role: 'company_admin', csrfToken };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      throw Object.assign(new Error('Ya existe una cuenta o una empresa con esos datos.'), { status: 409 });
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function authenticate(pool, req, res, next) {
  const token = sessionTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar.' });

  try {
    const sessionResult = await pool.query(
      `SELECT s.user_id, s.csrf_token, s.expires_at, u.email, u.full_name,
              u.is_super_admin, u.active
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [hash(token)]
    );
    const session = sessionResult.rows[0];
    if (!session || !session.active || new Date(session.expires_at) <= new Date()) {
      if (session) await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [hash(token)]);
      clearSessionCookie(res);
      return res.status(401).json({ error: 'La sesión venció o fue cerrada. Inicia sesión nuevamente.' });
    }

    const memberships = await pool.query(
      `SELECT m.company_id, m.role_id, c.name AS company_name
       FROM company_memberships m
       JOIN companies c ON c.id = m.company_id
       WHERE m.user_id = $1 AND m.active AND c.active
       ORDER BY c.name`,
      [session.user_id]
    );
    const requestedCompanyId = req.get('x-company-id');
    if (requestedCompanyId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedCompanyId)) {
      return res.status(400).json({ error: 'La empresa seleccionada no tiene un identificador válido.' });
    }
    let company;
    if (requestedCompanyId) {
      company = session.is_super_admin
        ? (await pool.query('SELECT id AS company_id, name AS company_name FROM companies WHERE id = $1 AND active', [requestedCompanyId])).rows[0]
        : memberships.rows.find((membership) => membership.company_id === requestedCompanyId);
    } else {
      company = memberships.rows[0];
      if (!company && session.is_super_admin) {
        company = (await pool.query('SELECT id AS company_id, name AS company_name FROM companies WHERE active ORDER BY name LIMIT 1')).rows[0];
      }
    }
    if (!company) return res.status(403).json({ error: 'Tu usuario no tiene acceso a una empresa activa.' });
    if (!session.is_super_admin && !memberships.rows.some((membership) => membership.company_id === company.company_id)) {
      return res.status(403).json({ error: 'No tienes acceso a la empresa seleccionada.' });
    }

    const role = session.is_super_admin
      ? 'super_admin'
      : memberships.rows.find((membership) => membership.company_id === company.company_id)?.role_id;
    const permissionRows = session.is_super_admin
      ? await pool.query('SELECT id FROM permissions')
      : await pool.query(
        `SELECT rp.permission_id AS id FROM role_permissions rp WHERE rp.role_id = $1`,
        [role]
      );
    req.auth = {
      userId: session.user_id,
      email: session.email,
      fullName: session.full_name,
      isSuperAdmin: session.is_super_admin,
      role,
      companyId: company.company_id,
      companyName: company.company_name,
      csrfToken: session.csrf_token,
      permissions: new Set(permissionRows.rows.map((row) => row.id))
    };
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (unsafeMethod && !matchesToken(req.get('x-csrf-token'), session.csrf_token)) {
      return res.status(403).json({ error: 'La solicitud no superó la validación de seguridad. Recarga la página e inténtalo de nuevo.' });
    }
    return tenantContext.run({ companyId: company.company_id }, next);
  } catch (error) {
    console.error('No se pudo validar la sesión de usuario:', error);
    return res.status(500).json({ error: 'No se pudo validar la sesión.' });
  }
}

export async function sessionInfoForLogin(pool, user) {
  const memberships = await pool.query(
    `SELECT m.company_id, m.role_id, c.name AS company_name
     FROM company_memberships m
     JOIN companies c ON c.id = m.company_id
     WHERE m.user_id = $1 AND m.active AND c.active
     ORDER BY c.name`,
    [user.userId]
  );
  const company = user.isSuperAdmin
    ? (await pool.query('SELECT id AS company_id, name AS company_name FROM companies WHERE active ORDER BY name LIMIT 1')).rows[0]
    : memberships.rows[0];
  if (!company) {
    throw Object.assign(new Error('No hay una empresa activa asociada a este usuario.'), { status: 403 });
  }
  const role = user.isSuperAdmin ? 'super_admin' : memberships.rows[0].role_id;
  const permissions = user.isSuperAdmin
    ? await pool.query('SELECT id FROM permissions')
    : await pool.query('SELECT permission_id AS id FROM role_permissions WHERE role_id = $1', [role]);
  return {
    user: {
      id: user.userId,
      email: user.email,
      fullName: user.fullName,
      role,
      companyId: company.company_id,
      companyName: company.company_name,
      isSuperAdmin: user.isSuperAdmin
    },
    companies: user.isSuperAdmin
      ? (await pool.query('SELECT id, name FROM companies WHERE active ORDER BY name')).rows
      : memberships.rows.map(({ company_id, company_name }) => ({ id: company_id, name: company_name })),
    permissions: permissions.rows.map((row) => row.id),
    csrfToken: user.csrfToken
  };
}

export async function sessionInfo(pool, req, res) {
  const companies = req.auth.isSuperAdmin
    ? await pool.query('SELECT id, name FROM companies WHERE active ORDER BY name')
    : await pool.query(
      `SELECT c.id, c.name FROM company_memberships m
       JOIN companies c ON c.id = m.company_id
       WHERE m.user_id = $1 AND m.active AND c.active ORDER BY c.name`,
      [req.auth.userId]
    );
  return res.json({
    user: {
      id: req.auth.userId,
      email: req.auth.email,
      fullName: req.auth.fullName,
      role: req.auth.role,
      companyId: req.auth.companyId,
      companyName: req.auth.companyName,
      isSuperAdmin: req.auth.isSuperAdmin
    },
    companies: companies.rows,
    permissions: [...req.auth.permissions],
    csrfToken: req.auth.csrfToken
  });
}

export async function logout(pool, req, res) {
  const token = sessionTokenFromRequest(req);
  await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [hash(token)]);
  clearSessionCookie(res);
  return res.status(204).end();
}

export async function changePassword(pool, userId, currentPassword, newPassword, res) {
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
      newPassword.length < 12 || newPassword.length > 256) {
    throw Object.assign(new Error('Ingresa la contraseña actual y una nueva contraseña de al menos 12 caracteres.'), { status: 400 });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT password_hash FROM users WHERE id = $1 AND active FOR UPDATE', [userId]);
    if (!result.rowCount || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      throw Object.assign(new Error('La contraseña actual es incorrecta.'), { status: 400 });
    }
    await client.query(
      'UPDATE users SET password_hash = $2, failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1',
      [userId, await bcrypt.hash(newPassword, 12)]
    );
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    await client.query('COMMIT');
    return await createSession(pool, userId, res);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function sendPasswordReset(pool, emailInput) {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw Object.assign(new Error('La recuperación por correo aún no está configurada. Define SMTP_HOST, SMTP_FROM, SMTP_USER y SMTP_PASSWORD.'), { status: 503 });
  }
  const email = normalizeEmail(emailInput);
  const userResult = await pool.query('SELECT id FROM users WHERE email = $1 AND active', [email]);
  if (!userResult.rowCount) return;

  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + interval '30 minutes')`,
    [hash(token), userResult.rows[0].id]
  );
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
  const resetUrl = new URL('/restablecer', process.env.APP_BASE_URL || 'http://localhost:3000');
  resetUrl.searchParams.set('token', token);
  await transport.sendMail({
    from,
    to: email,
    subject: 'Recuperación de contraseña - Renta al Día',
    text: `Solicitaste cambiar tu contraseña. Abre este enlace válido por 30 minutos: ${resetUrl}`
  });
}

export async function resetPassword(pool, token, password) {
  if (typeof token !== 'string' || token.length < 30 ||
      typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw Object.assign(new Error('El enlace no es válido o la contraseña no cumple el mínimo de 12 caracteres.'), { status: 400 });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [hash(token)]
    );
    if (!result.rowCount) throw Object.assign(new Error('El enlace venció o ya fue utilizado.'), { status: 400 });
    const userId = result.rows[0].user_id;
    await client.query(
      'UPDATE users SET password_hash = $2, failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1',
      [userId, await bcrypt.hash(password, 12)]
    );
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [userId]);
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
