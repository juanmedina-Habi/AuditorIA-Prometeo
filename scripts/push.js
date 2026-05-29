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

console.log(`-> Ambiente: ${env.toUpperCase()}`);
console.log(`-> Script ID: ${scriptId.slice(0, 15)}...`);
console.log("");

withClaspScriptId(scriptId, () => {
  try {
    execSync("clasp push --force", { cwd: ROOT, stdio: "inherit" });
    console.log(`\nPush a ${env.toUpperCase()} completado.`);
  } catch (err) {
    console.error(`\nError en push a ${env.toUpperCase()}.`);
    process.exit(1);
  }
});
