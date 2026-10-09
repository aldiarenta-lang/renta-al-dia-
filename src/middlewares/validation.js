export function validateFields(input, definitions, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('El cuerpo de la solicitud debe ser un objeto.'), { status: 400 });
  }
  const keys = Object.keys(input);
  const unknown = keys.find((key) => !Object.hasOwn(definitions, key));
  if (unknown) {
    throw Object.assign(new Error(`El campo "${unknown}" no está permitido.`), { status: 400 });
  }
  if (!partial) {
    const missing = Object.entries(definitions).find(([key, field]) => field.required && !Object.hasOwn(input, key));
    if (missing) {
      throw Object.assign(new Error(`El campo "${missing[0]}" es obligatorio.`), { status: 400 });
    }
  }

  const validated = {};
  for (const [key, value] of Object.entries(input)) {
    const rule = definitions[key];
    if (value === null && rule.nullable) {
      validated[key] = null;
      continue;
    }
    if (rule.type === 'text') {
      if (typeof value !== 'string' || (rule.required && value.trim().length === 0) || value.length > rule.max) {
        throw Object.assign(new Error(`El campo "${key}" debe contener texto válido (máximo ${rule.max} caracteres).`), { status: 400 });
      }
      validated[key] = value.trim();
    } else if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') throw Object.assign(new Error(`El campo "${key}" debe ser verdadero o falso.`), { status: 400 });
      validated[key] = value;
    } else if (rule.type === 'enum') {
      if (typeof value !== 'string' || !rule.values.includes(value)) {
        throw Object.assign(new Error(`El valor del campo "${key}" no está permitido.`), { status: 400 });
      }
      validated[key] = value;
    } else if (rule.type === 'date') {
      const parsedDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00.000Z`)
        : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
        throw Object.assign(new Error(`El campo "${key}" debe ser una fecha válida.`), { status: 400 });
      }
      validated[key] = value;
    } else {
      const numericValue = typeof value === 'number' ? value : Number(value);
      if (value === '' || !Number.isFinite(numericValue) || (rule.type === 'integer' && !Number.isInteger(numericValue)) ||
          (rule.min !== undefined && numericValue < rule.min) || (rule.max !== undefined && numericValue > rule.max)) {
        throw Object.assign(new Error(`El campo "${key}" debe ser un número válido dentro del rango permitido.`), { status: 400 });
      }
      validated[key] = numericValue;
    }
  }
  return validated;
}

export function recordKey(definition, rawId) {
  if (definition.integerKey) {
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) throw Object.assign(new Error('El identificador no es válido.'), { status: 400 });
    return id;
  }
  if (!rawId || rawId.length > 180) throw Object.assign(new Error('El identificador no es válido.'), { status: 400 });
  return rawId;
}

export function databaseError(error, res) {
  if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  if (error.code === '23503') return res.status(409).json({ error: 'No se puede guardar o eliminar: el registro está relacionado con otros datos. Actualiza primero las referencias.' });
  if (error.code === '23514' || error.code === '22P02') return res.status(400).json({ error: 'El valor no cumple las validaciones del sistema.' });
  console.error('Error al consultar PostgreSQL:', error);
  return res.status(500).json({ error: 'No se pudo completar la operación en PostgreSQL.' });
}
