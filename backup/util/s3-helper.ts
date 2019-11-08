import { S3, Credentials } from "aws-sdk";
import { writeFileSync } from "fs";
import { Backup } from "./backup-helper";
import path from "path";

export class S3Helper {
  private client: S3;

  constructor(client: S3) {
    this.client = client;
  }

  public static new(accessKeyId: string, secretAccessKey: string): S3Helper {
    const credentials = new Credentials(accessKeyId, secretAccessKey);
    return new S3Helper(new S3({ credentials }));
  }

  public async downloadObject(
    bucket: string,
    src: string,
    dest: string
  ): Promise<void> {
    const result = await this.client
      .getObject({ Bucket: bucket, Key: src })
      .promise();

    writeFileSync(dest, result.Body);
  }

  public async downloadBackup(backup: Backup, dest: string): Promise<string> {
    // create the destination path
    const archive = path.join(dest, path.parse(backup.file).base);

    // download
    await this.downloadObject(backup.bucket, backup.file, archive);

    return archive;
  }
}
