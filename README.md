# Renta al Día

## Desarrollo

La ruta principal `/` abre directamente el Dashboard y todos los módulos se sirven desde una sola aplicación Express en `http://localhost:3000`, sin registro ni inicio de sesión. Inicia PostgreSQL y ejecuta:

```powershell
npm.cmd run dev
```

El Dashboard está en `/` (la antigua ruta `/dashboard` sigue disponible por compatibilidad); los demás módulos se abren en rutas internas como `/clientes`, `/ventas`, `/impuestos` e `/importar-excel`. El servidor sirve la aplicación al abrir o recargar directamente cualquier ruta. La API permanece en `/api` y utiliza PostgreSQL con el contexto de la empresa operadora configurado al iniciar la aplicación.

Si PostgreSQL no tiene una empresa operadora, el arranque crea una empresa demo y su configuración inicial de forma idempotente, muestra un aviso en consola y continúa. Los datos existentes no se reemplazan.

## Producción y dominios

La aplicación no depende del nombre del host. Al publicar el servicio Node en Render, `https://renta-al-dia.onrender.com/` abre directamente el Dashboard. También puede ejecutarse detrás de un proxy TLS, apuntando el host a la misma instancia. En Docker, la aplicación escucha en el puerto interno `3000`; `APP_PORT` configura el puerto externo publicado por Compose.

El servidor web debe reenviar todas las rutas de la aplicación al mismo servicio y preservar `/api`. Como el panel no exige autenticación, limita el acceso al operador mediante la red privada, VPN o controles del proxy inverso antes de publicarlo en Internet. Estos controles no requieren cambios en las rutas ni en PostgreSQL.
