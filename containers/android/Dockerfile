FROM circleci/android:api-28-node

USER root

RUN apt update \
    && apt install gradle

# setup RH internal npm nexus registry

ADD https://password.corp.redhat.com/RH-IT-Root-CA.crt /RH-IT-Root-CA.crt

RUN chmod +r /RH-IT-Root-CA.crt

RUN npm config set -g cafile /RH-IT-Root-CA.crt

RUN npm config set -g registry https://repository.engineering.redhat.com/nexus/repository/registry.npmjs.org

RUN npm -g install cordova ionic@4

RUN useradd -m -u 1001 jenkins

ENV HOME=/home/jenkins

USER jenkins
