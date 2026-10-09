export function errorHandler(error, _req, res, _next) {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo JSON no tiene un formato válido.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo supera el límite de 15 MB.' });
  if (error.type === 'encoding.unsupported' || error.type === 'charset.unsupported') {
    return res.status(415).json({ error: 'El formato o la codificación del archivo no son compatibles.' });
  }
  console.error('Error inesperado en el servidor:', error);
  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
}
