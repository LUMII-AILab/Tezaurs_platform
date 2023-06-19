#!/usr/bin/env bash

IMG=registry.gitlab.com/ailab/tezaurs

if [ $# -eq 0 ]; then
    TAG=latest
    echo "Build local ${IMG}:${TAG}"
    export GIT_COMMIT=$(git show -s --format='%h %s')
    export GIT_BRANCH=$(git branch --show-current)
    export BUILD_TS=$(date "+%Y-%m-%d %H:%M")
    docker build --build-arg GIT_COMMIT --build-arg GIT_BRANCH --build-arg BUILD_TS -t $IMG:$TAG .
fi

# ./make.sh push 0.1
if [ "$1" == "push" ]; then
    TAG=${2:-latest}
    echo "Push ${IMG}:${TAG}"
    docker tag $IMG:latest $IMG:$TAG \
    && docker push $IMG:$TAG
fi
