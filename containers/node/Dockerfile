FROM circleci/node:dubnium-stretch-browsers

USER root

# setup RH internal npm nexus registry

ADD https://password.corp.redhat.com/RH-IT-Root-CA.crt /RH-IT-Root-CA.crt

RUN chmod +r /RH-IT-Root-CA.crt

RUN npm config set -g cafile /RH-IT-Root-CA.crt

RUN npm config set -g registry https://repository.engineering.redhat.com/nexus/repository/registry.npmjs.org

# install oc cli tool

ADD https://github.com/openshift/origin/releases/download/v3.11.0/openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit.tar.gz $HOME/oc.tar.gz

RUN tar -xvf oc.tar.gz

RUN mv openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit/* /usr/local/bin/

# create jenkins user

RUN useradd -m -u 1001 jenkins

ENV HOME=/home/jenkins

USER jenkins
