import { randomString } from "../../common/util/utils";
import { log } from "../../common/util/log";
const LOGS_BACKUP_REGEX = /^upload: '\S+' -> '(s3:\/\/(?<bucket>\S+?)\/(?<file>.+))'/gm;
export class BackupHelper {
    constructor(kh) {
        this.kh = kh;
    }
    async backup(cronjobName, namespace) {
        // start the backup job
        const job = await this.kh.createJobFromCronJob(`${cronjobName}-${randomString()}`, cronjobName, namespace);
        log.info(`BackupHelper: backup job '${job.metadata.name}' started` +
            ` in namespace '${namespace}'`);
        // wait for the backup job to complete
        await this.kh.waitForJobToComplete(job.metadata.name, namespace);
        log.info(`BackupHelper: backup job '${job.metadata.name}' completed`);
        // find the pod used from the backup job
        const pod = (await this.kh.listPod(namespace, `job-name=${job.metadata.name}`))[0];
        // retrieve all logs of the backup job pod
        const logs = await this.kh.log(namespace, pod.metadata.name, pod.spec.containers[0].name);
        // find the url of the backup
        const re = new RegExp(LOGS_BACKUP_REGEX);
        const backups = [];
        let match = re.exec(logs);
        while (match !== null) {
            backups.push({
                bucket: match.groups.bucket,
                file: match.groups.file
            });
            match = re.exec(logs);
        }
        return backups;
    }
}
