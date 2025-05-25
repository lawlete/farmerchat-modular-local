# Resumen: Generar Certificado HTTPS con mkcert y Configurar Vite para Servir en HTTPS

## 1. Instalar mkcert (si no está instalado)

- Descargar e instalar mkcert según tu sistema operativo.
- [mkcert en GitHub](https://github.com/FiloSottile/mkcert)

---

## 2. Crear CA local (solo la primera vez)

```bash
mkcert -install
````

Esto crea una Autoridad Certificadora local y la instala en el sistema para que los certificados que generes sean confiables.

---

## 3. Generar certificado para localhost y redes locales

Desde la carpeta raíz del proyecto (o donde quieras guardar los certificados), ejecutar:

```bash
mkcert localhost 127.0.0.1 ::1
```

Esto genera dos archivos:

* `localhost.pem` (certificado)
* `localhost-key.pem` (clave privada)

---

## 4. Configurar Vite para usar HTTPS

Modificar el archivo `vite.config.ts` para incluir:

```typescript
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [basicSsl()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    server: {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem')),
      },
      host: true
    }
  };
});
```

---

## 5. Ejecutar el servidor Vite

```bash
npm run dev
```

o si usas `vite` directamente:

```bash
vite
```

La app se servirá sobre HTTPS, con el certificado válido, lo que permitirá permisos de micrófono en navegadores modernos.

---

## 6. En Android (u otros dispositivos en la misma red)

* Abrir el navegador Chrome.
* Ir a la URL local HTTPS del servidor (ejemplo: `https://192.168.1.X:3000`).
* Agregar la app a la pantalla de inicio cuando Chrome lo sugiera.
* Usar la app con permisos de micrófono sin problema.

---

## Notas

* Si cambias de equipo o carpeta, deberás repetir el proceso de generación del certificado.
* Puedes guardar los archivos `.pem` en un lugar seguro dentro del proyecto para reutilizarlos.
* El plugin `vite-plugin-basic-ssl` no es obligatorio si cargas manualmente los certificados como en el ejemplo.
* Para desarrollo local y pruebas, esta es la forma más sencilla de tener HTTPS confiable.

---

Si modificás archivos `.js` o `.ts` y necesitas reiniciar el servidor, solo para y vuelve a correr `npm run dev`.

```
