const { execSync } = require("child_process");
const {
  loadEnvironments,
  assertEnv,
  assertScriptId,
} = require("./_lib");

const env = process.argv[2];
assertEnv(env);

const envConfig = loadEnvironments();
const scriptId = assertScriptId(envConfig, env);

const url = `https://script.google.com/d/${scriptId}/edit`;

console.log(`Abriendo proyecto ${env.toUpperCase()} en el navegador...`);
console.log(`URL: ${url}`);
console.log("Nota: el editor de Apps Script se abre solo para revisar logs, ejecutar funciones o configurar Script Properties.");
console.log("Toda edicion de codigo sigue siendo desde Cursor + clasp.\n");

const platform = process.platform;
let command;
if (platform === "darwin") {
  command = `open ${JSON.stringify(url)}`;
} else if (platform === "win32") {
  // Windows: start "" "<url>" (las comillas vacias son el title)
  command = `cmd /c start "" ${JSON.stringify(url)}`;
} else {
  // Linux / WSL
  command = `xdg-open ${JSON.stringify(url)}`;
}

try {
  execSync(command, { stdio: "inherit" });
} catch (err) {
  console.error("\nNo se pudo abrir el navegador automaticamente.");
  console.error("Abre manualmente esta URL:");
  console.error(`  ${url}`);
  process.exit(1);
}
