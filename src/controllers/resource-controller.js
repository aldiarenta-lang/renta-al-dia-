import { pool } from '../db/pool.js';
import { validateFields, recordKey, databaseError } from '../middlewares/validation.js';

export function createResourceController(definition) {
  return {
    async list(req, res) {
      try {
        const values = [];
        let where = '';
        if (typeof req.query.q === 'string' && req.query.q.trim()) {
          values.push(`%${req.query.q.trim().slice(0, 120)}%`);
          where = `WHERE ${definition.search.map((field) => `CAST(${field} AS text) ILIKE $1`).join(' OR ')}`;
        }
        const result = await pool.query(
          `SELECT * FROM ${definition.view} ${where} ORDER BY ${definition.key} DESC LIMIT 5000`,
          values
        );
        res.json(result.rows);
      } catch (error) {
        databaseError(error, res);
      }
    },

    async create(req, res) {
      try {
        const values = validateFields(req.body, definition.fields);
        const fields = Object.keys(values);
        const result = await pool.query(
          `INSERT INTO ${definition.table} (company_id, ${fields.join(', ')})
           VALUES ($${fields.length + 1}, ${fields.map((_, index) => `$${index + 1}`).join(', ')})
           RETURNING ${definition.key}`,
          [...fields.map((field) => values[field]), req.auth.companyId]
        );
        const created = await pool.query(
          `SELECT * FROM ${definition.view} WHERE ${definition.key} = $1`,
          [result.rows[0][definition.key]]
        );
        res.status(201).json(created.rows[0]);
      } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        databaseError(error, res);
      }
    },

    async update(req, res) {
      try {
        const key = recordKey(definition, req.params.id);
        const values = validateFields(req.body, definition.fields, { partial: true });
        const fields = Object.keys(values);
        if (!fields.length) return res.status(400).json({ error: 'Indica al menos un campo para actualizar.' });
        const result = await pool.query(
          `UPDATE ${definition.table}
           SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')}
           WHERE ${definition.key} = $${fields.length + 1}
           RETURNING ${definition.key}`,
          [...fields.map((field) => values[field]), key]
        );
        if (!result.rowCount) return res.status(404).json({ error: 'El registro solicitado no existe.' });
        const updated = await pool.query(`SELECT * FROM ${definition.view} WHERE ${definition.key} = $1`, [key]);
        res.json(updated.rows[0]);
      } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        databaseError(error, res);
      }
    },

    async remove(req, res) {
      try {
        const key = recordKey(definition, req.params.id);
        const result = await pool.query(`DELETE FROM ${definition.table} WHERE ${definition.key} = $1`, [key]);
        if (!result.rowCount) return res.status(404).json({ error: 'El registro solicitado no existe.' });
        res.status(204).end();
      } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        databaseError(error, res);
      }
    }
  };
}
