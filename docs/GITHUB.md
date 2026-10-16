# Trabajar con GitHub

## Qué se sube y qué NO
- **Se sube:** todo el código, la documentación y el flujo automático que construye el `.exe`.
- **NO se sube** (está en `.gitignore`): `src/js/config.local.js` (tus claves), tus datos (`datos.json`) y respaldos.
  Tus claves y movimientos nunca salen de tu computadora.

## Cada vez que modifiques algo
```bash
git add -A
git commit -m "Describe qué cambiaste"
git push
```
Al hacer `push`, GitHub corre las pruebas (`node tests/calc.test.js`) y construye el `.exe` automáticamente
(Actions → último “Construir .exe” → *Artifacts* → `Mis-Inversiones-exe`).

## Publicar una versión con el .exe listo para descargar
```bash
git tag v1.1.0
git push origin v1.1.0
```
GitHub crea una **Release** con `Mis-Inversiones-portable.exe` y `Mis-Inversiones-instalador.exe`.
(Sube también el número `"version"` en `package.json`.)

## En otra computadora
```bash
git clone https://github.com/TU_USUARIO/mis-inversiones.git
cd mis-inversiones
copy src\js\config.local.example.js src\js\config.local.js   # y pon tus claves
INICIAR.bat
```

## Consejos
- Si el repositorio es **público**, nadie ve tus claves (están fuera), pero tu guía y tus tesis por defecto sí quedan visibles en el código. Si no quieres eso, créalo **privado**.
- Si alguna vez subiste una clave por error, **regénerala** en el sitio del proveedor (FMP / Alpha Vantage).
