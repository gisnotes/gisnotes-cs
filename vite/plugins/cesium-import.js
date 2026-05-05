import fs from "node:fs";
import path from "node:path";

const CESIUM_SOURCE_ROOT = "node_modules/cesium/Build/CesiumUnminified/";
const CESIUM_SERVE_PREFIX = "/libs/cesium/";

const MIME_TYPES = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".gif": "image/gif",
  ".xml": "application/xml",
};

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default function createCesiumPlugins(
  mode,
  command,
  base,
  cesiumBaseUrl,
) {
  const isProd = mode === "production";
  const isServe = command === "serve";
  const scriptSrc = isProd
    ? `${cesiumBaseUrl}Cesium.js`
    : `${base}${cesiumBaseUrl}Cesium.js`;

  const plugins = [
    {
      name: "vite:cesium-external",
      enforce: "pre",
      resolveId(id) {
        if (id === "cesium") {
          return { id: "\0cesium", external: true };
        }
      },
      load(id) {
        if (id === "\0cesium") {
          return `const Cesium = window.Cesium; export { Cesium }; export default Cesium;`;
        }
      },
    },
    {
      name: "vite:cesium-html-inject",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          `  <script src="${scriptSrc}"></script>\n  </head>`,
        );
      },
    },
  ];

  if (isServe) {
    plugins.push({
      name: "vite:cesium-dev-serve",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url || !req.url.startsWith(CESIUM_SERVE_PREFIX)) {
            return next();
          }
          const relativePath = req.url.slice(CESIUM_SERVE_PREFIX.length);
          const filePath = path.join(
            process.cwd(),
            CESIUM_SOURCE_ROOT,
            relativePath,
          );
          try {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              res.setHeader(
                "Content-Type",
                MIME_TYPES[ext] || "application/octet-stream",
              );
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // file not found, fall through
          }
          next();
        });
      },
    });
  } else {
    const isExternalCesium =
      cesiumBaseUrl && /^https?:\/\//.test(cesiumBaseUrl);
    if (!isExternalCesium) {
      plugins.push({
        name: "vite:cesium-build-copy",
        apply: "build",
        closeBundle() {
          const outDir = path.join(process.cwd(), "dist", CESIUM_SERVE_PREFIX);
          const sourceDir = path.join(process.cwd(), CESIUM_SOURCE_ROOT);
          copyDirRecursive(sourceDir, outDir);
        },
      });
    }
  }

  return plugins;
}
