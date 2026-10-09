import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';

const assignableRoles = new Set(['company_admin', 'accountant', 'financial_advisor', 'admin_assistant']);

function isSuperAdmin(req) {
  return req.auth?.isSuperAdmin === true;
}

function boundedText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

export async function listCompanies(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el Super Administrador puede consultar todas las empresas.' });
  try {
    const result = await pool.privilegedQuery(
      `SELECT c.id, c.name, c.tax_id, c.representative, c.email, c.phone, c.municipality, c.active, c.created_at,
              l.status AS license_status, l.starts_at, l.ends_at, p.name AS plan_name
       FROM companies c
       LEFT JOIN LATERAL (
         SELECT company_id, plan_id, status, starts_at, ends_at
         FROM company_licenses
         WHERE company_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) l ON true
       LEFT JOIN subscription_plans p ON p.id = l.plan_id
       ORDER BY c.name`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('No se pudo consultar las empresas:', error);
    return res.status(500).json({ error: 'No se pudo consultar las empresas.' });
  }
}

export async function createCompany(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el Super Administrador puede crear empresas.' });
  const name = boundedText(req.body?.name, 180);
  const taxId = boundedText(req.body?.taxId, 32);
  const municipality = boundedText(req.body?.municipality, 100) || '';
  const email = boundedText(req.body?.email, 254)?.toLowerCase() || '';
  const phone = boundedText(req.body?.phone, 40) || '';
  const representative = boundedText(req.body?.representative, 180) || '';
  if (!name || !taxId) return res.status(400).json({ error: 'El nombre y el NIT de la empresa son obligatorios.' });
  try {
    const result = await pool.privilegedQuery(
      `INSERT INTO companies (id, name, tax_id, representative, email, phone, municipality)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, tax_id, representative, email, phone, municipality, active, created_at`,
      [randomUUID(), name, taxId, representative, email, phone, municipality]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una empresa con ese NIT.' });
    console.error('No se pudo crear la empresa:', error);
    return res.status(500).json({ error: 'No se pudo crear la empresa.' });
  }
}

export async function updateCompany(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el Super Administrador puede modificar empresas.' });
  const active = req.body?.active;
  const name = req.body?.name === undefined ? undefined : boundedText(req.body.name, 180);
  if (typeof active !== 'boolean' && name === undefined) {
    return res.status(400).json({ error: 'Indica si la empresa debe activarse o proporciona su nombre.' });
  }
  if (req.body?.name !== undefined && !name) return res.status(400).json({ error: 'El nombre de la empresa no es válido.' });
  try {
    const result = await pool.privilegedQuery(
      `UPDATE companies SET active = COALESCE($2, active), name = COALESCE($3, name)
       WHERE id = $1 RETURNING id, name, tax_id, active`,
      [req.params.id, typeof active === 'boolean' ? active : null, name ?? null]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'La empresa no existe.' });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('No se pudo actualizar la empresa:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la empresa.' });
  }
}

export async function listPlans(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el Super Administrador puede consultar los planes.' });
  try {
    const result = await pool.privilegedQuery('SELECT id, name, description, monthly_price, features, active, created_at FROM subscription_plans ORDER BY name');
    return res.json(result.rows);
  } catch (error) {
    console.error('No se pudieron consultar los planes:', error);
    return res.status(500).json({ error: 'No se pudieron consultar los planes.' });
  }
}

export async function savePlan(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el Super Administrador puede administrar planes.' });
  const name = boundedText(req.body?.name, 100);
  const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 1000) : '';
  const monthlyPrice = Number(req.body?.monthlyPrice);
  const features = req.body?.features;
  if (!name || !Number.isFinite(monthlyPrice) || monthlyPrice < 0 ||
      (features !== undefined && (!Array.isArray(features) || features.some((feature) => typeof feature !== 'string' || feature.length > 120)))) {
    return res.status(400).json({ error: 'El nombre, precio o lista de características del plan no son válidos.' });
  }
  try {
    const result = await pool.privilegedQuery(
      `INSERT INTO subscription_plans (id, name, description, monthly_price, features)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description,
         monthly_price = EXCLUDED.monthly_price, features = EXCLUDED.features
       RETURNING id, name, description, monthly_price, features, active`,
      [randomUUID(), name, description, monthlyPrice, JSON.stringify(features || [])]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('No se pudo guardar el plan:', error);
    return res.status(500).json({ error: 'No se pudo guardar el plan.' });
  }
}

export async function setCompanyLicense(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el Super Administrador puede administrar licencias.' });
  const { planId, status, startsAt, endsAt } = req.body || {};
  if (!['active', 'suspended', 'expired'].includes(status) ||
      !startsAt || Number.isNaN(Date.parse(startsAt)) ||
      (endsAt != null && Number.isNaN(Date.parse(endsAt)))) {
    return res.status(400).json({ error: 'El estado o las fechas de la licencia no son válidos.' });
  }
  try {
    const result = await pool.privilegedQuery(
      `INSERT INTO company_licenses (id, company_id, plan_id, status, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_id, plan_id, status, starts_at, ends_at`,
      [randomUUID(), req.params.id, planId, status, startsAt, endsAt || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') return res.status(404).json({ error: 'La empresa o el plan indicado no existe.' });
    console.error('No se pudo asignar la licencia:', error);
    return res.status(500).json({ error: 'No se pudo asignar la licencia.' });
  }
}

export async function listUsers(req, res) {
  if (!req.auth.permissions.has('users:read')) return res.status(403).json({ error: 'Tu rol no puede consultar usuarios.' });
  try {
    const result = await pool.privilegedQuery(
      `SELECT u.id, u.email, u.full_name, u.active AS user_active, m.active AS membership_active,
              m.role_id, m.created_at
       FROM company_memberships m JOIN users u ON u.id = m.user_id
       WHERE m.company_id = $1
       ORDER BY u.full_name`,
      [req.auth.companyId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('No se pudieron consultar los usuarios:', error);
    return res.status(500).json({ error: 'No se pudieron consultar los usuarios.' });
  }
}

export async function createCompanyUser(req, res) {
  if (!req.auth.permissions.has('users:manage')) return res.status(403).json({ error: 'Tu rol no puede administrar usuarios.' });
  const email = boundedText(req.body?.email, 254)?.toLowerCase();
  const fullName = boundedText(req.body?.fullName, 180);
  const password = req.body?.password;
  const roleId = req.body?.role;
  const allowed = isSuperAdmin(req) ? assignableRoles : new Set(['accountant', 'financial_advisor', 'admin_assistant']);
  if (!email || !fullName || typeof password !== 'string' || password.length < 12 || password.length > 256 ||
      !allowed.has(roleId)) {
    return res.status(400).json({ error: 'Nombre, correo, rol permitido y contraseña de al menos 12 caracteres son obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let user = (await client.query('SELECT id, is_super_admin FROM users WHERE email = $1 FOR UPDATE', [email])).rows[0];
    if (user?.is_super_admin) throw Object.assign(new Error('No se puede asignar la cuenta global a una empresa.'), { status: 409 });
    if (!user) {
      const id = randomUUID();
      await client.query(
        'INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4)',
        [id, email, await bcrypt.hash(password, 12), fullName]
      );
      user = { id };
    }
    const result = await client.query(
      `INSERT INTO company_memberships (user_id, company_id, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, company_id) DO NOTHING
       RETURNING user_id`,
      [user.id, req.auth.companyId, roleId]
    );
    if (!result.rowCount) throw Object.assign(new Error('Ese usuario ya pertenece a esta empresa.'), { status: 409 });
    await client.query('COMMIT');
    return res.status(201).json({ id: user.id, email, fullName, role: roleId, active: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === '23505') return res.status(409).json({ error: 'El correo ya está en uso.' });
    console.error('No se pudo crear el usuario de empresa:', error);
    return res.status(500).json({ error: 'No se pudo crear el usuario.' });
  } finally {
    client.release();
  }
}

export async function updateCompanyUser(req, res) {
  if (!req.auth.permissions.has('users:manage')) return res.status(403).json({ error: 'Tu rol no puede administrar usuarios.' });
  const { active, role } = req.body || {};
  if (active === undefined && role === undefined) return res.status(400).json({ error: 'Indica el nuevo estado o rol del usuario.' });
  if (active !== undefined && typeof active !== 'boolean') return res.status(400).json({ error: 'El estado debe ser verdadero o falso.' });
  const allowed = isSuperAdmin(req) ? assignableRoles : new Set(['accountant', 'financial_advisor', 'admin_assistant']);
  if (role !== undefined && !allowed.has(role)) return res.status(400).json({ error: 'El rol solicitado no está permitido.' });
  if (req.params.id === req.auth.userId && active === false) return res.status(400).json({ error: 'No puedes desactivar tu propio acceso desde esta pantalla.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (role !== undefined) {
      const target = await client.query(
        'SELECT role_id FROM company_memberships WHERE user_id = $1 AND company_id = $2 FOR UPDATE',
        [req.params.id, req.auth.companyId]
      );
      if (!target.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'El usuario no pertenece a esta empresa.' });
      }
      if (target.rows[0].role_id === 'company_admin' && role !== 'company_admin') {
        const admins = await client.query(
          `SELECT count(*)::int AS total FROM company_memberships
           WHERE company_id = $1 AND role_id = 'company_admin' AND active AND user_id <> $2`,
          [req.auth.companyId, req.params.id]
        );
        if (!admins.rows[0].total) throw Object.assign(new Error('La empresa debe conservar al menos un administrador.'), { status: 409 });
      }
    }
    const result = await client.query(
      `UPDATE company_memberships SET active = COALESCE($3, active), role_id = COALESCE($4, role_id)
       WHERE user_id = $1 AND company_id = $2
       RETURNING user_id, active, role_id`,
      [req.params.id, req.auth.companyId, typeof active === 'boolean' ? active : null, role || null]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El usuario no pertenece a esta empresa.' });
    }
    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo actualizar el usuario:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el usuario.' });
  } finally {
    client.release();
  }
}
