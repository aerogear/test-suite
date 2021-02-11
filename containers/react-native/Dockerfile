FROM circleci/android:api-29-node

USER root

RUN apt update \
    && apt install gradle

# setup RH internal npm nexus registry

ADD https://password.corp.redhat.com/RH-IT-Root-CA.crt /RH-IT-Root-CA.crt

RUN chmod +r /RH-IT-Root-CA.crt

RUN npm config set -g cafile /RH-IT-Root-CA.crt

RUN npm config set -g registry https://repository.engineering.redhat.com/nexus/repository/registry.npmjs.org

# install oc cli tool

ADD https://mirror.openshift.com/pub/openshift-v4/clients/oc/latest/linux/oc.tar.gz $HOME/oc.tar.gz

# ADD https://mirror.openshift.com/pub/openshift-v4/clients/oc/latest/macosx/oc.tar.gz $HOME/oc.tar.gz

RUN tar -xvf $HOME/oc.tar.gz

RUN mv oc /usr/local/bin/

# install watchman

ADD https://github.com/facebook/watchman/releases/download/v2020.09.21.00/watchman-v2020.09.21.00-linux.zip $HOME/watchman.zip

RUN unzip $HOME/watchman.zip

RUN mkdir -p /usr/local/{bin,lib} /usr/local/var/run/watchman
RUN cp watchman-v2020.09.21.00-linux/bin/* /usr/local/bin
RUN cp watchman-v2020.09.21.00-linux/lib/* /usr/local/lib
RUN chmod 755 /usr/local/bin/watchman
RUN chmod 2777 /usr/local/var/run/watchman

# create jenkins user

RUN npm install -g react-native

RUN npm install -g detox-cli

RUN useradd -m -u 1001 jenkins

ENV HOME=/home/jenkins

RUN echo 'kernel.unprivileged_userns_clone=1' > /etc/sysctl.d/00-local-userns.conf

RUN service procps restart


# Git clone

#RUN git clone https://github.com/aerogear/unifiedpush-cookbook.git $HOME/unifiedpush-cookbook
#RUN cd $HOME/unifiedpush-cookbook/react-native/push
#COPY ./google-services.json $HOME/unifiedpush-cookbook/react-native/push/android/app/
#COPY ./push-config.json $HOME/unifiedpush-cookbook/react-native/push/

# Android sdkmanager doesn't work with java 11 - workaround

RUN mkdir $ANDROID_HOME/tools/jaxb_lib
RUN wget https://repo1.maven.org/maven2/javax/activation/activation/1.1.1/activation-1.1.1.jar -O $ANDROID_HOME/tools/jaxb_lib/activation.jar
RUN wget https://repo1.maven.org/maven2/com/sun/xml/bind/jaxb-impl/2.3.3/jaxb-impl-2.3.3.jar -O $ANDROID_HOME/tools/jaxb_lib/jaxb-impl.jar
RUN wget https://repo1.maven.org/maven2/com/sun/istack/istack-commons-runtime/3.0.11/istack-commons-runtime-3.0.11.jar -O $ANDROID_HOME/tools/jaxb_lib/istack-commons-runtime.jar
RUN wget https://repo1.maven.org/maven2/org/glassfish/jaxb/jaxb-xjc/2.3.3/jaxb-xjc-2.3.3.jar -O $ANDROID_HOME/tools/jaxb_lib/jaxb-xjc.jar
RUN wget https://repo1.maven.org/maven2/org/glassfish/jaxb/jaxb-core/2.3.0.1/jaxb-core-2.3.0.1.jar -O $ANDROID_HOME/tools/jaxb_lib/jaxb-core.jar
RUN wget https://repo1.maven.org/maven2/org/glassfish/jaxb/jaxb-jxc/2.3.3/jaxb-jxc-2.3.3.jar -O $ANDROID_HOME/tools/jaxb_lib/jaxb-jxc.jar
RUN wget https://repo1.maven.org/maven2/javax/xml/bind/jaxb-api/2.3.1/jaxb-api-2.3.1.jar -O $ANDROID_HOME/tools/jaxb_lib/jaxb-api.jar
# Append jaxb_lib to the CLASSPATH in sdkmanager and avdmanager
RUN sed -ie 's%^CLASSPATH=.*%\0:$APP_HOME/jaxb_lib/*%' $ANDROID_HOME/tools/bin/sdkmanager $ANDROID_HOME/tools/bin/avdmanager

RUN $ANDROID_HOME/tools/bin/sdkmanager --update
RUN $ANDROID_HOME/tools/bin/sdkmanager --install emulator
RUN $ANDROID_HOME/tools/bin/sdkmanager "platforms;android-28"
RUN $ANDROID_HOME/tools/bin/sdkmanager "system-images;android-29;google_apis_playstore;x86"

USER jenkins

RUN $ANDROID_HOME/tools/bin/avdmanager create avd -n Pixel_4_API_29 -d pixel --package "system-images;android-29;google_apis_playstore;x86"
# Headless emulator run - $ANDROID_HOME/emulator/emulator -verbose -no-window -no-audio -gpu swiftshader_indirect @Pixel_4_API_29 &


