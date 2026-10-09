# Renta al Día

## Desarrollo

La interfaz y la API se sirven desde una sola aplicación Express en `http://localhost:3000`. Inicia PostgreSQL y ejecuta:

```powershell
npm.cmd run dev
```

Las páginas usan rutas internas, por ejemplo `/`, `/login`, `/registro`, `/dashboard`, `/admin`, `/contador`, `/asesor` y `/cliente`. El servidor sirve la aplicación también al abrir o recargar directamente cualquiera de esas rutas. La API permanece en `/api` y utiliza la misma conexión PostgreSQL.

## Producción y dominios

La aplicación no depende del nombre del host. Puede publicarse en `www.rentaaldia.com` o detrás de un proxy TLS en `app.rentaaldia.com` o `admin.rentaaldia.com`, apuntando el proxy a la misma instancia de la aplicación. Configura `APP_BASE_URL` con la URL pública elegida para que los enlaces de recuperación de contraseña usen ese dominio. En Docker, la aplicación escucha en el puerto interno `3000`; `APP_PORT` configura el puerto externo publicado por Compose.

El servidor web debe reenviar todas las rutas de la aplicación al mismo servicio y preservar `/api`. La configuración DNS, TLS y el proxy inverso pertenecen al despliegue y no requieren cambios en las rutas ni en PostgreSQL.
