# Mis Inversiones

Administrador personal de inversiones hecho a partir de **“Mi guía de inversión”** (11 oct 2026).
Material educativo con reglas propias; no es asesoría financiera.

## Qué trae
| Sección | Qué hace |
|---|---|
| **Portafolio** | Valor total, ganancia (USD y pesos), gráficas por posición y sector, mezcla vs. objetivo, “posiciones efectivas”, tecnología real (con el ETF), alertas de tus reglas (15 % por posición, 40 % por sector, colchón de efectivo), próximos reportes y semáforo. |
| **Tesis** | Por empresa: las **4 preguntas**, el **filtro de 15** (5 filtros × 3 sí/no, calificación automática con tu lectura 5/5, 3-4/5, 0-2/5), reglas de venta, plan de compra, qué vigilar. Ya trae SPOT, NVDA, AXP, META, GOOGL, VOO y tu mapa de empresas. |
| **Calculadora** | % objetivo × valor del portafolio → monto, dividido en 2-4 compras (editable) con condición para cada una, acciones aprox., y avisos si rompe topes o no hay efectivo. Planes guardados con botón “Registrar”. |
| **Movimientos** | Compras, ventas, dividendos, depósitos, retiros (con tipo de cambio y motivo). De aquí se calcula todo el portafolio. Exporta CSV. |
| **Noticias** | Financial Modeling Prep + Alpha Vantage (con sentimiento), de tus acciones, un ticker o el mercado. |
| **Mi guía** | Todo tu método (editable), semáforo macro, calendario de reportes con cuenta regresiva, checklists, mapa de empresas y diario. |
| **Glosario** | 84 términos, buscador y categorías; puedes agregar los tuyos. |
| **Ajustes** | Divisa, tipo de cambio, claves API, topes, mezcla objetivo, respaldo/restauración. |

## Cómo usarla
1. **Sin instalar nada:** doble clic en `ABRIR-SIN-INSTALAR.bat` (abre en tu navegador; datos en el navegador).
2. **Como programa de escritorio:** instala [Node.js LTS](https://nodejs.org) y haz doble clic en `INICIAR.bat`.
3. **Generar el .exe:** doble clic en `CONSTRUIR-EXE.bat`. Tras instalar la primera versión compilada con este código, el instalador NSIS avisa cuando hay una versión nueva publicada en GitHub y te permite instalarla. La versión portable avisa y abre la descarga para sustituir el archivo manualmente. En la carpeta `dist` quedan
   `Mis-Inversiones-portable.exe` (un solo archivo) y `Mis-Inversiones-instalador.exe`.
   Tus datos se guardan en `%APPDATA%\Mis Inversiones\datos.json` (con copia `datos.bak.json`).

## Android

El proyecto también incluye una app Android con Capacitor. Para compilar localmente, instala Android Studio con SDK y Java 21, ejecuta `npm ci`, `npm run android:sync` y abre la carpeta `android` en Android Studio. GitHub Actions construye una APK de prueba al subir cambios a `main` y publica una APK firmada con cada etiqueta de versión. Antes de publicar, configura una vez los secretos de firma descritos en [docs/GITHUB.md](docs/GITHUB.md). La app pregunta si quieres abrir la Release; Android confirma la descarga e instalación.

Los datos se guardan por separado en cada dispositivo. Para compartirlos, usa Ajustes → respaldo/restauración. Esta versión se distribuye desde GitHub; Google Play requiere publicar en Play Console por separado.

## Primeros pasos
1. Ajustes → revisa el tipo de cambio y pega tu clave de Alpha Vantage (la de FMP ya viene precargada).
2. Movimientos → registra un depósito y tus compras (si ya las tenías antes de la app, desmarca “Afecta mi efectivo”).
3. Portafolio → “Actualizar precios”.
(¿Quieres ver cómo luce? Portafolio → “Cargar datos de ejemplo”; se borran con un clic.)

## Estructura
```
main.js / preload.js     Electron (ventana, guardado en archivo, actualizaciones)
src/index.html           Interfaz
src/js/calc.js           Cálculos (puro; probado con  npm test)
src/js/data.js           Tu guía convertida en datos
src/js/store.js          Capa de datos con adaptadores (listo para base de datos + login)
src/js/api.js            FMP y Alpha Vantage
src/js/views/*.js        Pantallas
db/schema.sql            Esquema PostgreSQL/Supabase para la versión con login
android/                 Aplicación Android (Capacitor)
tests/calc.test.js       Pruebas
```
⚠ Tus claves viven en `src/js/config.local.js` (no se sube a GitHub). Ver `docs/GITHUB.md` para configurar la firma Android y publicar versiones.




