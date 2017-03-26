#!/usr/bin/env bash

set -e

if [ -z "$DOCKER_USERNAME" ]; then
	echo DOCKER_USERNAME environment variable is required >&2
	exit 1
fi

if [ -z "$DOCKER_PASSWORD" ]; then
	echo DOCKER_PASSWORD environment variable is required >&2
	exit 1
fi

docker login -u "$DOCKER_USERNAME" -p "$DOCKER_PASSWORD"

exec "$@"
