# AeroGear Backup Tests

## Prepare

Install dependencies:

```bash
npm install
```

### Install Backup

Not every RHMI cluster come with backup functionality preinstalled.

To check if backup is installed run:

```bash
oc get secret -n openshift-integreatly-backups s3-credentials
```

If the `openshift-integreatly-backups` namespace and the `s3-credentials` secret exists, you can skip this section, otherwise follow this step to install the backup jobs.

1. Create a S3 Bucket in AWS

   - Go to S3 console: https://s3.console.aws.amazon.com/s3/home
   - Create bucket with the name you want in the region you want
   - Keep the default _Configuration_ and _Permissions_

2. Create an Access key

   - Go to _My security credentials_ from the dropdown that pop out by clicking on your username in the top right corner
   - Under the _Access keys_ section create a new key
   - Save the ID and Key in a secured place, because you will not be able to see the key anymore

3. Add the backup Job

   - Follow the tutorial in the integr8ly installation repository: https://github.com/integr8ly/installation#10-add-backup-jobs-optional-not-needed-for-dev
   - If you don't have the `openshift-integreatly-backups` namespace or the `s3-credentials` secret use this command instant of the sample one:

     ```bash
     ansible-playbook \
        -i inventories/host \
        -e 'backup_schedule="30 2 * * *"' \
        -e 'backup_namespace=openshift-integreatly-backups' \
        -e 'backup_s3_aws_bucket="YOUR_BUCKET_NAME"' \
        -e 'backup_s3_aws_access_key="YOUR_AWS_KEY_ID"' \
        -e 'backup_s3_aws_secret_key="YOUR_AWS_KEY_SECRET"' \
        playbooks/install_backups.yml
     ```

## Run the Tests

**pre-backup**

Go to the device suite and follow the [device/README.md](../device/README.md)
to create working data to backup and ensure the tests are working previously
to the backup.

**backup**

Login to OpenShift using the **cluster-admin** user:

```
oc login ...
```

Run the backup and restore tests:

```bash
npm test
```

**post-backup**

Switch back to an unprivileged user and run again all tests in the test suite without
recreating the test app.
