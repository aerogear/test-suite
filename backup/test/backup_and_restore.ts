import { KubeHelper } from "../util/kube-helper";
import { S3Helper } from "../util/s3-helper";
import { dirSync } from "tmp";
import path from "path";
import { log } from "../../common/util/log";
import { BackupHelper, Backup } from "../util/backup-helper";
import { untar, decode, gunzipAll, execScript } from "../util/utils";
import { restoreNamespace } from "../util/restore-utils";
import fs from "fs";

const BACKUPS_NAMESPACE = "openshift-integreatly-backups";
const MDC_NAMESPACE = "mobile-developer-console";
const UPS_NAMESPACE = "mobile-unifiedpush";
const MSS_NAMESPACE = "mobile-security-service";

describe("Backup & Restore", function() {
  this.timeout(0);

  let kh: KubeHelper;
  let sh: S3Helper;

  before(async () => {
    // connect to the openshift api
    kh = new KubeHelper();

    // retrieve S3 credentials
    const credentials = await kh.readSecret(
      "s3-credentials",
      BACKUPS_NAMESPACE
    );

    // connect to the s3 bucket
    sh = S3Helper.new(
      decode(credentials.data.AWS_ACCESS_KEY_ID),
      decode(credentials.data.AWS_SECRET_ACCESS_KEY)
    );
  });

  let mdcNamespace: string;
  let upsNamespace: string;
  let mssNamespace: string;

  it("discover namespace names", async () => {
    // resolve the correct namespace
    // because it change from RHPDS to OSD
    // TODO: find a global solution to this problem
    const namespaces = (await kh.listNamespace()).map(n => n.metadata.name);
    mdcNamespace = namespaces.find(n => n.includes(MDC_NAMESPACE));
    upsNamespace = namespaces.find(n => n.includes(UPS_NAMESPACE));
    mssNamespace = namespaces.find(n => n.includes(MSS_NAMESPACE));

    log.info(`mdcNamespace = "${mdcNamespace}"`);
    log.info(`upsNamespace = "${upsNamespace}"`);
    log.info(`mssNamespace = "${mssNamespace}"`);
  });

  let resourceBackup: Backup;
  let upsBackup: Backup;
  let mssBackup: Backup;

  it("should backup all namespaces, ups database and mss database", async () => {
    const bh = new BackupHelper(kh);

    // run in parallel
    const [resourceBackups, upsBackups, mssBackups] = await Promise.all([
      bh.backup("resources-backup", BACKUPS_NAMESPACE),
      bh.backup("ups-daily-at-midnight", upsNamespace),
      bh.backup("mobile-security-service-backup", mssNamespace)
    ]);

    resourceBackup = resourceBackups[0];
    // the ups backup job will return two backups
    // and we have to find the right one
    upsBackup = upsBackups.find(b =>
      /unifiedpush-\d{2}_\d{2}_\d{2}.pg_dump.gz$/.test(b.file)
    );
    // as for the ups
    mssBackup = mssBackups.find(b =>
      /mobile_security_service-\d{2}_\d{2}_\d{2}.pg_dump.gz$/.test(b.file)
    );

    log.info(`resourceBackup = ${JSON.stringify(resourceBackup)}`);
    log.info(`upsBackup = ${JSON.stringify(upsBackup)}`);
    log.info(`mssBackup = ${JSON.stringify(mssBackup)}`);
  });

  it("should remove all mdc crs", async () => {
    // remove the KeycloakRealm cr before the mdc namespace
    // otherwise the keycloak operator will not be able to
    // finalize the operation
    // same for UPS and MSS crs
    for (const [apiVersion, kind] of [
      ["aerogear.org/v1alpha1", "KeycloakRealm"],
      ["push.aerogear.org/v1alpha1", "PushApplication"],
      ["push.aerogear.org/v1alpha1", "AndroidVariant"],
      ["push.aerogear.org/v1alpha1", "IOSVariant"],
      [
        "mobile-security-service.aerogear.org/v1alpha1",
        "MobileSecurityServiceApp"
      ]
    ]) {
      await kh.forceDeleteCollectionAndWait(apiVersion, kind, mdcNamespace);
    }
  });

  it("should remove mss namespaces", async () => {
    await kh.deleteNamespaceAndWait(mssNamespace);
  });

  it("should remove ups namespaces", async () => {
    await kh.deleteNamespaceAndWait(upsNamespace);
  });

  it("should remove mdc namespaces", async () => {
    await kh.deleteNamespaceAndWait(mdcNamespace);
  });

  let tmpdir: string;

  it("should download and extract resources, ups and mss backups", async () => {
    // create a temporary directory where download the backup
    tmpdir = dirSync().name;

    // download resources backups
    const resourceArchive = await sh.downloadBackup(resourceBackup, tmpdir);
    await untar(resourceArchive);

    log.info("resources backup download and extracted");

    // download mss db backup
    await sh.downloadBackup(mssBackup, tmpdir);
    log.info("mss backup download");

    // download ups db backup
    await sh.downloadBackup(upsBackup, tmpdir);
    log.info("ups backup download");

    // extract all gz files
    gunzipAll(tmpdir);

    log.info(`tmpdir = "${tmpdir}"`);
  });

  it("should restore mss namespace", async () => {
    // restore the namespace
    await restoreNamespace(
      kh,
      tmpdir,
      mssNamespace,
      ["services", "routes", "deployments"],
      ["addressspaceschemas"]
    );
    log.info("mss namespace restored");
  });

  it("should restore mss database", async () => {
    // wait for the database to be ready
    await kh.waitForDeployment("mobile-security-service-db", mssNamespace);
    await kh.waitForDeploymentToReconcile(
      "mobile-security-service-db",
      mssNamespace
    );

    // scale the operator down
    await kh.scaleDeploymentAndWait(
      "mobile-security-service-operator",
      mssNamespace,
      0
    );

    // scale mss down
    await kh.scaleDeploymentAndWait("mobile-security-service", mssNamespace, 0);

    // restore mss database
    const databasePod = (await kh.listPod(
      mssNamespace,
      "name=mobilesecurityservicedb"
    ))[0];

    // find the mss dump
    const re = /\.mobile_security_service-\d{2}_\d{2}_\d{2}\.pg_dump$/;
    const file = fs.readdirSync(tmpdir).find(f => re.test(f));

    // restore the dump
    await kh.exec(
      mssNamespace,
      databasePod.metadata.name,
      databasePod.spec.containers[0].name,
      ["bash", "-lc", "psql mobile_security_service"],
      fs.createReadStream(path.join(tmpdir, file))
    );
    log.info("mss db restored");

    // scale mss up
    await kh.scaleDeploymentAndWait("mobile-security-service", mssNamespace, 1);

    // scale the operator up
    await kh.scaleDeploymentAndWait(
      "mobile-security-service-operator",
      mssNamespace,
      1
    );
  });

  it("should restore ups namespace", async () => {
    // restore the namespace
    await restoreNamespace(
      kh,
      tmpdir,
      upsNamespace,
      ["services", "routes", "deploymentconfigs"],
      ["addressspaceschemas"]
    );
    log.info("ups namespace restored");
  });

  it("should restore ups database", async () => {
    // wait for the database to be ready
    await kh.waitForDeploymentConfig("unifiedpush-postgresql", upsNamespace);
    await kh.waitForDeploymentConfigToReconcile(
      "unifiedpush-postgresql",
      upsNamespace
    );

    // scale the operator down
    await kh.scaleDeployment("unifiedpush-operator", upsNamespace, 0);

    // scale mss down
    await kh.scaleDeploymentConfigAndWait("unifiedpush", upsNamespace, 0);

    // restore mss database
    const databasePod = (await kh.listPod(
      upsNamespace,
      "deploymentconfig=unifiedpush-postgresql"
    ))[0];

    // find the mss dump
    const re = /\.unifiedpush-\d{2}_\d{2}_\d{2}\.pg_dump$/;
    const file = fs.readdirSync(tmpdir).find(f => re.test(f));

    // restore the dump
    await kh.exec(
      upsNamespace,
      databasePod.metadata.name,
      databasePod.spec.containers[0].name,
      ["bash", "-lc", "psql unifiedpush"],
      fs.createReadStream(path.join(tmpdir, file))
    );
    log.info("ups db restored");

    // scale mss up
    await kh.scaleDeploymentConfigAndWait("unifiedpush", upsNamespace, 1);

    // scale the operator up
    await kh.scaleDeploymentAndWait("unifiedpush-operator", upsNamespace, 1);
  });

  it("should restore mdc namespace", async () => {
    await restoreNamespace(
      kh,
      tmpdir,
      mdcNamespace,
      ["services", "routes", "deploymentconfigs"],
      [
        "addressspaceschemas",
        // resources that will be imported from the
        // mobile-developer-console-restoration.sh
        // script
        "androidvariants",
        "iosvariants",
        "keycloakrealms",
        "mobilesecurityserviceapps",
        "pushapplications",
        "configmaps"
      ]
    );
    log.info("mdc namespace restored");

    // wait for mdc
    await kh.waitForDeploymentConfig("mdc", mdcNamespace);

    // execute the mobile-developer-console-restoration.sh script
    // to finalize the restore process
    const script = path.join(
      __dirname,
      "../fixtures/mobile-developer-console-restoration.sh"
    );
    const [out, , , code] = await execScript(script, [tmpdir, mdcNamespace]);
    if (code !== 0) {
      throw new Error(`child process exit with code '${code}'\n${out}`);
    }
    log.info("mobile-developer-console-restoration.sh script completed");
  });
});
