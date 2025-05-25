Lo hice para que lo puedas correr con:

```bash
node generate-cert.cjs
```

---

### generate-cert.cjs

```js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const certDir = path.resolve(process.cwd());
const certKeyPath = path.join(certDir, 'localhost-key.pem');
const certCertPath = path.join(certDir, 'localhost.pem');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || stdout || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function generateCert() {
  try {
    // 1. Instalar CA local (solo si no está instalado)
    console.log('Instalando CA local con mkcert (si no está instalado)...');
    await runCommand('mkcert -install');

    // 2. Generar certificados para localhost y redes
    console.log('Generando certificado para localhost, 127.0.0.1 y ::1...');
    await runCommand(`mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1`);

    // 3. Verificar que archivos se crearon
    if (fs.existsSync(certKeyPath) && fs.existsSync(certCertPath)) {
      console.log('Certificados generados correctamente:');
      console.log(' -', certKeyPath);
      console.log(' -', certCertPath);
    } else {
      throw new Error('Los certificados no se generaron correctamente.');
    }

  } catch (error) {
    console.error('❌ Error al generar los certificados:', error);
  }
}

generateCert();
```

---

### Cómo usarlo

1. Guarda ese código en un archivo llamado `generate-cert.cjs` en la raíz de tu proyecto (donde está tu `vite.config.ts`).

2. Asegurate de tener instalado mkcert y que esté en el PATH.

3. Corre:

```bash
node generate-cert.cjs
```

---

### ¿Qué hace?

* Ejecuta `mkcert -install` para instalar la CA local (si no está instalada).
* Genera certificados para `localhost`, `127.0.0.1` y `::1`.
* Guarda los archivos `localhost-key.pem` y `localhost.pem` en la carpeta del proyecto.
* Imprime mensajes claros con el resultado.
