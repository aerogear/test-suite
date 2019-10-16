# AeroGear Backend Tests

## Install dependencies

```
npm install
```

## Target OpenShift

Tests need to target OpenShift instance with RHMI. For this use:

```
oc login ...
```

## Setup environment variables

These variables for testing UPS are required:

```
export FIREBASE_SERVER_KEY=...
export IOS_CERTIFICATE=...
export IOS_PASSPHRASE=...
export OPENSHIFT_USER=<ADMIN_USERNAME>
export OPENSHIFT_PASS=<ADMIN_PASSWORD>

```

For the iOS certificate, you can generate fake one using:

```
openssl req -x509 -newkey rsa:4096 -out cert.pem # use test as passphrase
openssl pkcs12 -export -out key.p12 -in cert.pem -nokeys # use test as password
base64 ./key.p12 # copy the output
```

## Run the tests

```
npm start
```
