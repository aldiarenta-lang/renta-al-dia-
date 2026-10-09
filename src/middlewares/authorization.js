export function authorize(permission) {
  return (req, res, next) => {
    if (!req.auth?.permissions.has(permission)) {
      return res.status(403).json({ error: 'Tu rol no tiene permiso para realizar esta acción.' });
    }
    return next();
  };
}
