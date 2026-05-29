const { execSync } = require("child_process");
const {
  ROOT,
  loadEnvironments,
  assertEnv,
  assertScriptId,
  withClaspScriptId,
} = require("./_lib");

const env = process.argv[2];
assertEnv(env);

const envConfig = loadEnvironments();
const scriptId = assertScriptId(envConfig, env);

console.log(`Logs de ${env.toUpperCase()}:\n`);

withClaspScriptId(scriptId, () => {
  try {
    execSync("clasp logs", { cwd: ROOT, stdio: "inherit" });
  } catch (err) {
    console.error("Error al obtener logs.");
    process.exit(1);
  }
});
