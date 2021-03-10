#!/bin/bash -e
cd "$(dirname "$0")/.."

_step() {
  echo "———————————————————————————————————————————————————————————————————————————"
  echo ">>> $@"
}

# Check version
_step "Checking version in package.json vs NPM"
ESTRELLA_VERSION=$(node -e 'process.stdout.write(require("./package.json").version)')
ESTRELLA_NPM_VERSION=$(npm show estrella version)
if [ "$ESTRELLA_NPM_VERSION" == "$ESTRELLA_VERSION" ]; then
  echo "version in package.json needs to be updated ($ESTRELLA_VERSION is already published on NPM)" >&2
  exit 1
fi

# Check fsevents dependency which must match that in chokidar.
# Chokidar is embedded/bundled with estrella but fsevents must be loaded at runtime as it
# contains platform-native code.
_step "Checking fsevents version in package.json"
CHOKIDAR_FSEVENTS_VERSION=$(node -e \
  'process.stdout.write(require("./node_modules/chokidar/package.json").optionalDependencies["fsevents"])')
ESTRELLA_FSEVENTS_VERSION=$(node -e \
  'process.stdout.write(require("./package.json").optionalDependencies["fsevents"])')
if [ "$CHOKIDAR_FSEVENTS_VERSION" != "$ESTRELLA_FSEVENTS_VERSION" ]; then
  echo "The version of fsevents needs to be updated in package.json" >&2
  echo "to match that required by chokidar. Change it to this:" >&2
  echo "  \"fsevents\": \"$CHOKIDAR_FSEVENTS_VERSION\"" >&2
  echo >&2
  exit 1
fi

# checkout products so that npm version doesn't fail.
# These are regenerated later anyways.
# TODO: exception for changes to dist/npm-postinstall.js which is not generated
_step "Resetting ./dist/ and checking for uncommitted changes"
git checkout -- dist
if ! (git diff-index --quiet HEAD --); then
  echo "There are uncommitted changes:" >&2
  git status -s --untracked-files=no --ignored=no
  exit 1
fi

GIT_TREE_HASH=$(git rev-parse HEAD)
CLEAN_EXIT=false

_onexit() {
  if $CLEAN_EXIT; then
    exit
  fi
  if [ "$(git rev-parse HEAD)" != "$GIT_TREE_HASH" ]; then
    echo "Rolling back git (to $GIT_TREE_HASH)"
    git reset --hard "$GIT_TREE_HASH"
  fi
}
trap _onexit EXIT

# build
_step "./build.js"
./build.js

# test
_step "./test/test.sh"
./test/test.sh

# publish to npm (fails and stops this script if the version is already published)
_step "npm publish"
npm publish

# commit, tag and push git
_step "git commit"
git commit -m "release v${ESTRELLA_VERSION}" dist package.json package-lock.json
git tag "v${ESTRELLA_VERSION}"
git push origin master "v${ESTRELLA_VERSION}"

CLEAN_EXIT=true
