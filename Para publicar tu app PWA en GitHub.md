**Para publicar tu app PWA en GitHub Pages** de forma **gratuita** 

Accesible desde cualquier dispositivo con conexión a internet (incluso desde tu móvil).


## 🌐 ¿Qué necesitas?

* Una app **build con Vite** (como tu proyecto en TypeScript).
* Que la app esté configurada como **PWA** (con manifest, service worker, etc.).
* Un repositorio en GitHub donde subir la app.
* Una rama `gh-pages` o usar el directorio `docs/` (dependiendo del enfoque).

---

## 🚀 PASO A PASO PARA PUBLICAR TU APP PWA EN GITHUB PAGES

### 1. 🛠️ Configura `vite.config.ts` para GitHub Pages

Agrega el `base` correspondiente a la URL donde se publicará:

```ts
export default defineConfig({
  base: '/nombre-del-repo/', // MUY IMPORTANTE
  // ...
});
```

> 🔁 Reemplaza `'nombre-del-repo'` con el nombre real del repositorio en GitHub.

---

### 2. ⚙️ Instala y configura `vite-plugin-pwa` (si aún no lo hiciste)

```bash
npm install vite-plugin-pwa --save-dev
```

Y en tu `vite.config.ts`:

```ts
import { VitePWA } from 'vite-plugin-pwa'

plugins: [
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt'],
    manifest: {
      name: 'FarmerChat',
      short_name: 'FarmerChat',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#4CAF50',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  })
]
```

---

### 3. 🧱 Genera el **build** de producción

```bash
npm run build
```

Esto crea una carpeta `dist/` con tu app lista para ser desplegada.

---

### 4. 📤 Publica en GitHub Pages

#### Opción A – Usar acción de GitHub (recomendado)

1. Instala el paquete:

```bash
npm install gh-pages --save-dev
```

2. Agrega un script en tu `package.json`:

```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Ejecuta:

```bash
npm run deploy
```

Esto:

* Hace el build
* Publica automáticamente el contenido de `dist/` en la rama `gh-pages`

---

### 5. 🌐 Accede a tu app desde la nube

Tu app estará disponible en:

```
https://<tu-usuario>.github.io/<nombre-del-repo>/
```

Por ejemplo:

```
https://lawlete.github.io/farmerchat-modular-local/
```

---

## ✅ Beneficios

* Es **100% gratuito** y fácil de mantener.
* Compatible con **PWA**: puedes **instalarla como app** en Android o escritorio.
* Ideal para compartir o probar la app sin necesidad de backend o hosting.


