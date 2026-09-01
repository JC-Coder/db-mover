# The Firebase emulators need a JRE, and Google publishes no official image, so build
# a small one. Pinned so the emulator version does not drift under contributors.
FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends default-jre-headless curl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g firebase-tools@13.29.1

WORKDIR /app
COPY firebase.json .firebaserc ./

EXPOSE 8080 9000

CMD ["firebase", "emulators:start", \
     "--only", "database,firestore", \
     "--project", "dbmover-emulator"]
