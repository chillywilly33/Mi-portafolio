# Trabajar con GitHub

## Qué se sube y qué NO
- Se sube el código, la documentación y los flujos de compilación.
- No se sube `src/js/config.local.js`, tus datos ni la clave de firma Android. Los movimientos siguen guardados localmente en cada dispositivo.

## Visibilidad del repositorio para las actualizaciones

GitHub muestra `chillywilly33/Mi-portafolio` como público. El actualizador consulta las Releases de ese repositorio sin credenciales; por eso también son públicos el código, la guía y los instaladores/APK que se publiquen. Si todavía no existe una Release, la API responde 404; al publicar la primera etiqueta versionada, la consulta empezará a encontrarla. Si quieres mantener privado el código en el futuro, habrá que mover las Releases a un repositorio público separado antes de cambiar la visibilidad.

## Preparar la firma Android (solo una vez)
Android solo permite actualizar una app instalada cuando la nueva versión tiene la misma firma. Conserva una copia segura de la llave; si la pierdes, los usuarios tendrán que desinstalar la app y perderán sus datos locales.

En PowerShell, desde una carpeta segura fuera del repositorio, crea una llave. Guarda las contraseñas en un gestor seguro:

```powershell
keytool -genkeypair -v -keystore mis-inversiones-release.jks -alias mis-inversiones -keyalg RSA -keysize 2048 -validity 10000
$env:KEYSTORE_FILE = (Resolve-Path .\mis-inversiones-release.jks).Path
[Convert]::ToBase64String([IO.File]::ReadAllBytes($env:KEYSTORE_FILE)) | Set-Clipboard
```

En GitHub abre **Settings → Secrets and variables → Actions → New repository secret**. Crea estos cuatro secretos (pega el contenido del portapapeles para el primero):

- `ANDROID_KEYSTORE_BASE64`: llave codificada en Base64.
- `ANDROID_KEYSTORE_PASSWORD`: contraseña del archivo `.jks`.
- `ANDROID_KEY_ALIAS`: `mis-inversiones` (o el alias que elegiste).
- `ANDROID_KEY_PASSWORD`: contraseña de la llave.

No subas el `.jks` ni escribas las contraseñas en el repositorio. Conserva una copia de seguridad cifrada de la llave.

## Publicar una versión nueva
1. Cambia `version` en `package.json`, por ejemplo a `1.0.1`.
2. Guarda y sube el cambio a `main`.
3. Crea una etiqueta que coincida exactamente con esa versión y súbela:

```bash
git add -A
git commit -m "Preparar versión 1.0.1"
git push
git tag v1.0.1
git push origin v1.0.1
```

4. GitHub Actions valida la versión, construye el instalador Windows, sus archivos de actualización y el APK Android firmado, y los publica en GitHub Releases.
5. Instala manualmente esta primera versión con actualizador integrado (la instalación 1.0.0 anterior no incluía ese código). Desde la siguiente versión, Windows pregunta antes de descargar. El APK instalado pregunta si quieres abrir la Release; Android te pedirá confirmar la descarga y la instalación.

El instalador NSIS puede actualizarse desde la app. La versión portable muestra el aviso y abre la página de descarga para sustituir el `.exe` manualmente. La versión abierta con `ABRIR-SIN-INSTALAR.bat` es la página web local y no consulta actualizaciones.

En cada `push` a `main`, Actions también construye las apps para revisión; la APK de prueba no se publica como actualización. Una publicación etiquetada falla con un mensaje claro si faltan los secretos de firma.

## En otra computadora

```bash
git clone https://github.com/chillywilly33/Mi-portafolio.git
cd Mi-portafolio
copy src\js\config.local.example.js src\js\config.local.js
INICIAR.bat
```

## Nota sobre Google Play
El proyecto publica APKs para descarga desde GitHub. La tienda Google Play tiene sus propios canales de publicación y avisos de actualización; esta configuración no publica en Play Console.

## Privacidad
Si el repositorio es público, el código y tu guía/tesis por defecto también son públicos. Las claves API locales y datos personales permanecen fuera de GitHub; usa un repositorio privado si no quieres mostrar el contenido de la guía.





