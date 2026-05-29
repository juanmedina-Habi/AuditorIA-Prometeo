const { execSync } = require("child_process");
const {
  ROOT,
  loadEnvironments,
  saveEnvironments,
  assertEnv,
  assertScriptId,
  withClaspScriptId,
  timestamp,
  parseDescriptionFromArgs,
  parseDeploymentIdFromOutput,
} = require("./_lib");

const args = process.argv.slice(2);
const env = args[0];
assertEnv(env);

const envConfig = loadEnvironments();
const scriptId = assertScriptId(envConfig, env);

const existingDeploymentId = envConfig[env]?.deploymentId;

const description =
  parseDescriptionFromArgs(args) || `${env.toUpperCase()} deploy ${timestamp()}`;

console.log(`-> Ambiente: ${env.toUpperCase()}`);
console.log(`-> Script ID: ${scriptId.slice(0, 15)}...`);
if (existingDeploymentId) {
  console.log(`-> Actualizando deployment existente: ${existingDeploymentId}`);
} else {
  console.log(`-> Creando deployment nuevo (primera vez en este ambiente)`);
}
console.log(`-> Descripcion: ${description}`);
console.log("");

withClaspScriptId(scriptId, () => {
  try {
    execSync("clasp push --force", { cwd: ROOT, stdio: "inherit" });
    console.log("");

    const deployCmd = existingDeploymentId
      ? `clasp deploy --deploymentId ${JSON.stringify(existingDeploymentId)} --description ${JSON.stringify(description)}`
      : `clasp deploy --description ${JSON.stringify(description)}`;

    const out = execSync(deployCmd, {
      cwd: ROOT,
      encoding: "utf8",
    });
    process.stdout.write(out);

    if (existingDeploymentId) {
      // Reutilizamos el mismo deploymentId: solo actualizamos metadata.
      envConfig[env].deploymentDescription = description;
      envConfig[env].deployedAt = timestamp();
      saveEnvironments(envConfig);
      console.log(`\nDeploy a ${env.toUpperCase()} completado.`);
      console.log(`Deployment ID (reutilizado): ${existingDeploymentId}`);
    } else {
      // Primera vez en este ambiente: capturamos el ID nuevo y lo guardamos
      // para que todos los futuros deploys reutilicen este mismo.
      const deploymentId = parseDeploymentIdFromOutput(out);
      if (deploymentId) {
        envConfig[env].deploymentId = deploymentId;
        envConfig[env].deploymentDescription = description;
        envConfig[env].deployedAt = timestamp();
        saveEnvironments(envConfig);
        console.log(`\nDeploy inicial a ${env.toUpperCase()} completado.`);
        console.log(`Deployment ID (nuevo, guardado en environments.json): ${deploymentId}`);
        console.log(`Futuros 'deploy:${env}' reutilizaran este mismo ID.`);
      } else {
        console.warn(
          "\nNo se pudo extraer el deploymentId del output de clasp. Revisalo manualmente y agregalo a environments.json para que el proximo deploy reutilice el mismo deployment."
        );
      }
    }
  } catch (err) {
    console.error(`\nError en deploy a ${env.toUpperCase()}.`);
    process.exit(1);
  }
});
