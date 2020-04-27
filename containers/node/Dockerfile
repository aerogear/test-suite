FROM circleci/node:dubnium-stretch-browsers

USER root

# setup RH internal npm nexus registry

ADD https://password.corp.redhat.com/RH-IT-Root-CA.crt /RH-IT-Root-CA.crt

RUN chmod +r /RH-IT-Root-CA.crt

RUN npm config set -g cafile /RH-IT-Root-CA.crt

RUN npm config set -g registry https://repository.engineering.redhat.com/nexus/repository/registry.npmjs.org

# install oc cli tool

ADD https://mirror.openshift.com/pub/openshift-v4/clients/oc/latest/linux/oc.tar.gz $HOME/oc.tar.gz

RUN tar -xvf oc.tar.gz

RUN mv oc /usr/local/bin/

# create jenkins user

RUN useradd -m -u 1001 jenkins -G audio,video

ENV HOME=/home/jenkins

ENV CHROME_DEVEL_SANDBOX=/opt/google/chrome/chrome-sandbox

RUN echo $CHROME_DEVEL_SANDBOX

RUN echo 'kernel.unprivileged_userns_clone=1' > /etc/sysctl.d/00-local-userns.conf

RUN service procps restart

USER jenkins
