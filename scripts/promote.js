const { execSync } = require("child_process");
const {
  ROOT,
  loadEnvironments,
  saveEnvironments,
  assertScriptId,
  withClaspScriptId,
  timestamp,
  parseDescriptionFromArgs,
  parseDeploymentIdFromOutput,
} = require("./_lib");

const args = process.argv.slice(2);

const envConfig = loadEnvironments();
assertScriptId(envConfig, "dev");
const prodScriptId = assertScriptId(envConfig, "prod");

if (!envConfig.dev?.deploymentId) {
  console.warn(
    "Aviso: dev no tiene deploymentId registrado. Promueves el codigo local actual."
  );
  console.warn("Si querias promover una version validada de dev, primero corre: npm run deploy:dev\n");
}

const existingProdDeploymentId = envConfig.prod?.deploymentId;

const description =
  parseDescriptionFromArgs(args) ||
  `PROD promote ${timestamp()}${envConfig.dev?.deploymentDescription ? ` (desde dev: ${envConfig.dev.deploymentDescription})` : ""}`;

console.log("-> Promoviendo a PROD");
console.log(`-> Script ID prod: ${prodScriptId.slice(0, 15)}...`);
if (existingProdDeploymentId) {
  console.log(`-> Actualizando deployment existente en PROD: ${existingProdDeploymentId}`);
} else {
  console.log(`-> Creando deployment nuevo en PROD (primera vez)`);
}
console.log(`-> Descripcion: ${description}`);
console.log("");

withClaspScriptId(prodScriptId, () => {
  try {
    execSync("clasp push --force", { cwd: ROOT, stdio: "inherit" });
    console.log("");

    const deployCmd = existingProdDeploymentId
      ? `clasp deploy --deploymentId ${JSON.stringify(existingProdDeploymentId)} --description ${JSON.stringify(description)}`
      : `clasp deploy --description ${JSON.stringify(description)}`;

    const out = execSync(deployCmd, {
      cwd: ROOT,
      encoding: "utf8",
    });
    process.stdout.write(out);

    if (existingProdDeploymentId) {
      envConfig.prod.deploymentDescription = description;
      envConfig.prod.deployedAt = timestamp();
      saveEnvironments(envConfig);
      console.log(`\nPromocion a PROD completada.`);
      console.log(`Deployment ID (reutilizado): ${existingProdDeploymentId}`);
    } else {
      const deploymentId = parseDeploymentIdFromOutput(out);
      if (deploymentId) {
        envConfig.prod.deploymentId = deploymentId;
        envConfig.prod.deploymentDescription = description;
        envConfig.prod.deployedAt = timestamp();
        saveEnvironments(envConfig);
        console.log(`\nPromocion inicial a PROD completada.`);
        console.log(`Deployment ID (nuevo, guardado en environments.json): ${deploymentId}`);
        console.log(`Futuras promociones reutilizaran este mismo ID.`);
      } else {
        console.warn(
          "\nNo se pudo extraer el deploymentId del output de clasp. Revisalo manualmente y agregalo a environments.json."
        );
      }
    }
  } catch (err) {
    console.error("\nError en promocion a PROD.");
    process.exit(1);
  }
});
