# Hoja de ruta: base de datos, inicio de sesión y app de celular

## Cómo está armada hoy (y por qué ya está lista para crecer)
- **Interfaz** (`src/js/views/*`): solo habla con `App.Store` (leer `state`, llamar `set()`/`save()`).
- **Lógica** (`src/js/calc.js`): funciones puras, sin pantalla. Se puede reutilizar tal cual en un servidor (Node) o en la app móvil.
- **Datos** (`src/js/store.js`): un *adaptador* decide dónde se guardan. Hoy hay dos: archivo JSON (Electron) y `localStorage` (navegador).
  Para la nube basta con escribir un tercero (`RemoteAdapter`, ya hay un esqueleto comentado) que hable con una API.

## Fase 1 — Base de datos + login (la ruta más corta)
1. Crear un proyecto en **Supabase** (Postgres + inicio de sesión + API, con plan gratuito).
2. Ejecutar `db/schema.sql` (ya trae tablas por usuario y Row Level Security: cada persona solo ve lo suyo).
3. Agregar la pantalla de login (correo + contraseña, o Google) con `supabase-js`.
4. Implementar `RemoteAdapter.load()/save()` con Supabase y elegirlo en `Store.init()` cuando haya sesión.
   - Opción rápida: guardar el estado completo en una columna `jsonb` por usuario (migración en un día).
   - Opción ordenada: leer/escribir tabla por tabla (movimientos, tesis…) como define `schema.sql`.
5. Mover las llamadas a FMP/Alpha Vantage a una **función en el servidor** (Edge Function) para que las claves no vivan en el dispositivo.
6. Botón de “Importar mis datos locales” (usa el respaldo JSON que ya existe en Ajustes).

## Fase 2 — App de celular
- **Más sencillo:** convertir la interfaz en **PWA** (agregar `manifest.json` + service worker). Se instala desde el navegador del celular y ya usa el diseño responsivo que existe.
- **Apps nativas:** empaquetar la misma carpeta `src/` con **Capacitor** (iOS/Android) sin reescribir nada.
- **Si algún día quieres React Native / Flutter:** reutiliza `calc.js` y el esquema SQL; la interfaz se reescribe.

## Fase 3 — Mejoras sugeridas
- Historial diario del valor del portafolio (tabla `snapshots`) para ver su evolución real.
- Alertas (correo/notificación) cuando un reporte esté a 3 días o se active una regla de venta.
- Importar movimientos desde el estado de cuenta de tu casa de bolsa (CSV).
- Reporte anual de ganancias/dividendos en MXN para tu contador (ya guardas el tipo de cambio de cada movimiento).

## Seguridad
- Nunca subas `src/js/config.js` con claves reales a GitHub.
- En la nube: cifra las claves de API y usa solo HTTPS; con Supabase, deja SIEMPRE activado Row Level Security.
