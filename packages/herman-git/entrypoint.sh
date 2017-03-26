#!/usr/bin/env bash

set -e

docker login -u "$DOCKER_USERNAME" -p "$DOCKER_PASSWORD"

exec "$@"
