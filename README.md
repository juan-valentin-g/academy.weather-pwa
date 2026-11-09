# WeatherPWA

Aplicación de clima con Next.js y soporte PWA. Busca por ciudad o ubicación y guarda el último resultado en el navegador.

## Desarrollo local

1. Ejecuta `npm ci`.
2. Copia `.env.example` a `.env.local` si aún no existe y configura `WEATHER_API_KEY` con tu clave real de OpenWeather.
3. Ejecuta `npm run dev` y abre <http://localhost:3000>.

La clave se utiliza exclusivamente en `app/api/weather/route.js`. No uses el prefijo `NEXT_PUBLIC_` ni subas `.env.local` al repositorio.

## API de la aplicación

- `GET /api/weather?city=Oaxaca`: búsqueda por ciudad.
- `GET /api/weather?lat=17.0732&lon=-96.7266`: búsqueda por coordenadas.
- Respuesta 200: JSON de OpenWeather, unidades métricas y descripción en español.
- Errores: JSON con un campo `error`. 400 para parámetros inválidos, 404 para ciudad inexistente, 429 para cuota agotada, 500 si falta la clave y 502 si OpenWeather rechaza la clave o no puede responder correctamente.

El navegador consulta esta API del mismo dominio. Vercel ejecuta la consulta a OpenWeather en el servidor; no se necesita un servidor separado ni configurar CORS.

## Publicar en Vercel

1. En el proyecto de Vercel, abre **Settings → Environment Variables**.
2. Agrega `WEATHER_API_KEY` con tu clave real, sin comillas. Selecciona **Production** y **Preview** si también utilizas despliegues de prueba.
3. En **Settings → Build and Deployment**, verifica:

   | Campo | Valor |
   | --- | --- |
   | Framework Preset | Next.js |
   | Root Directory | Carpeta que contiene `package.json`; raíz si no hay subcarpeta |
   | Build Command | `npm run build` |
   | Output Directory | Predeterminado de Next.js, sin Override |
   | Install Command | Predeterminado de npm, o `npm ci` |

   `vercel.json` fija el framework y el comando de compilación. El script usa `next build --webpack` para la configuración actual de la PWA.

4. Sube los cambios al repositorio conectado a Vercel. Si cambias la variable después de desplegar, ejecuta **Deployments → Redeploy**.
5. Comprueba `https://TU-DOMINIO/api/weather?city=Oaxaca` y prueba las búsquedas desde la página. Para ubicación, permite el acceso cuando lo pida el navegador.

Los archivos del service worker se generan durante `npm run build`; no se versionan. Si una instalación anterior conserva la versión vieja, prueba primero en una ventana privada o elimina los datos del sitio y vuelve a abrirlo.

## Comprobaciones

```bash
npm run lint
npm test
npm run build
```

Las pruebas unitarias comprueban la validación, la construcción de solicitudes y el manejo de errores con respuestas simuladas; no verifican la validez de una clave real. La API requiere conexión para obtener datos nuevos; sin conexión la pantalla puede recuperar el último resultado guardado.
