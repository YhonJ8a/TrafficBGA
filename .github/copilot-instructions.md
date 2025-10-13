## Propósito breve

Instrucciones concisas para agentes de código (Copilot/AI) que trabajen en este repositorio "TrafficBGA". Describe la arquitectura mínima, flujos críticos, convenciones y ejemplos específicos extraídos del código existente.

## Visión general

- Este repositorio contiene un backend muy pequeño basado en Express dentro de la carpeta `api/` y está pensado para desplegarse en Vercel como Function (Serverless).
- Punto principal de entrada: `api/app.js` — un servidor Express envuelto con `serverless-http` y exportado como `handler`.

## Archivos clave

- `api/app.js` — Express (ES module). Usa `import` y exporta `export const handler = serverless(app);`.
- `vercel.json` — configura el runtime para `api/**/*.js` a `nodejs20.x` y enruta todas las peticiones a `/api/app.js`.
- `package.json` — scripts disponibles:
  - `start`: `node ./api/app.js` (arranca con Node directo)
  - `dev`: `nodemon ./api/app.js` (requiere tener `nodemon` o usar `npx nodemon`)

## Reglas / patrones detectables (usar al generar código)

- ES Modules: los ficheros de `api/` usan sintaxis `import`/`export`. Para evitar advertencias al ejecutar localmente, verifique `package.json` y añada `"type": "module"` si falta.
- Serverless handler: el archivo principal exporta `handler` vía `serverless-http`. No agregues `app.listen(...)` para el despliegue en Vercel — la plataforma invoca la función.
- Middlewares: `app.use(express.json())` se aplica globalmente hoy; nuevas rutas esperan JSON en el body.

## Ejemplos concretos (copiar/ajustar)

- Ruta simple existente (ver `api/app.js`):

  - GET `/` responde { message: "Servidor backend en Vercel funcionando 🚀" }
  - GET `/saludo` responde { message: "Hola desde Express en Vercel" }

- Para añadir una ruta nueva, edita `api/app.js` o crea módulos de router y `import`alos. Ejemplo (conceptual):

  - Añadir en `api/app.js`:

    app.get('/ping', (req, res) => res.json({ ok: true }));

  - Si prefieres modularizar, crea `api/routes/myRoute.js` exportando un Router y `import`arlo en `app.js`.

## Flujo de desarrollo y comandos (rápido)

- Instalar dependencias:

  npm install

- Ejecutar localmente (producción simple):

  npm run start

  Nota: `npm run start` ejecuta `node ./api/app.js`. Si ves la advertencia de ES modules, añade `"type": "module"` a `package.json` o ejecuta con `node --experimental-modules` según tu versión de Node.

- Ejecutar en modo desarrollo con reinicio automático (si no hay `nodemon` instalado):

  npx nodemon ./api/app.js

## Integración / despliegue

- Vercel: `vercel.json` especifica `nodejs20.x` para `api/**/*.js`. El proyecto asume despliegue directo a Vercel Functions. Evita modificar la firma `export const handler`.
- Dependencias importantes (ver `package.json`): `express` y `serverless-http`.

## Convenciones y decisiones detectadas

- API colocada bajo `api/` — todo el tráfico se enruta a `api/app.js` según `vercel.json`.
- No hay tests ni configuración de lint en el repo actual; no inventes pruebas automáticas sin pedir confirmación.
- Evitar usar `app.listen(...)` en archivos dentro de `api/` para mantener compatibilidad con Vercel.

## Qué evitar o revisar antes de proponer cambios

- No eliminar la exportación `handler` ni cambiar la forma de invocación sin actualizar `vercel.json`.
- Si añades `devDependencies` como `nodemon`, agrega instrucciones claras en `README` o `package.json`.

## Preguntas abiertas que puedes pedir al mantenedor

- ¿Deseas que añadamos `"type": "module"` en `package.json` para eliminar la advertencia local?
- ¿Prefieres modularizar rutas en `api/routes/` o mantener todo en `api/app.js`?

---

Si falta algo específico (p. ej. pruebas, CI, entorno de variables), pide acceso o detalles y puedo generar un plan de cambios pequeño y seguro.
