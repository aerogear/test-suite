import { S3, Credentials } from "aws-sdk";
import { writeFileSync } from "fs";
import path from "path";
export class S3Helper {
    constructor(client) {
        this.client = client;
    }
    static new(accessKeyId, secretAccessKey) {
        const credentials = new Credentials(accessKeyId, secretAccessKey);
        return new S3Helper(new S3({ credentials }));
    }
    async downloadObject(bucket, src, dest) {
        const result = await this.client
            .getObject({ Bucket: bucket, Key: src })
            .promise();
        writeFileSync(dest, result.Body);
    }
    async downloadBackup(backup, dest) {
        // create the destination path
        const archive = path.join(dest, path.parse(backup.file).base);
        // download
        await this.downloadObject(backup.bucket, backup.file, archive);
        return archive;
    }
}
