FROM node:18.12-alpine3.15
ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT
ARG GIT_BRANCH
ENV GIT_BRANCH=$GIT_BRANCH
ARG BUILD_TS
ENV BUILD_TS=$BUILD_TS
RUN apk add --update tzdata
WORKDIR /app
COPY /app/package*.json /app/
RUN npm install --production
COPY app /app
# RUN npm run build-time
# RUN npm run git-info
CMD npm run start
