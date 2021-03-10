#!/bin/bash -e
#
# usage: dist.sh [-major | -minor | -patch]
#   -major    Bump major version. e.g. 1.2.3 => 2.0.0
#   -minor    Bump minor version. e.g. 1.2.3 => 1.3.0
#   -patch    Bump patch version. e.g. 1.2.3 => 1.2.4
#   (nothing; Leave version in package.json unchanged)
#
cd "$(dirname "$0")/.."

ESTRELLA_VERSION=$(node -e 'process.stdout.write(require("./package.json").version)')

# Check fsevents dependency which must match that in chokidar.
# Chokidar is embedded/bundled with estrella but fsevents must be loaded at runtime as it
# contains platform-native code.
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
git checkout -- dist

if ! (git diff-index --quiet HEAD --); then
  echo "There are uncommitted changes:" >&2
  git status -s --untracked-files=no --ignored=no
  exit 1
fi

GIT_TREE_HASH=$(git rev-parse HEAD)
CLEAN_EXIT=false

BUMP=
if [ "$1" == "" ]; then true
elif [ "$1" == "-major" ]; then BUMP=major
elif [ "$1" == "-minor" ]; then BUMP=minor
elif [ "$1" == "-patch" ]; then BUMP=patch
else
  echo "Unexpected option $1" >&2
  echo "usage: $0 [-major | -minor | -patch]"
  exit 1
fi

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

# update version in package.json
npm --no-git-tag-version version "$ESTRELLA_VERSION" --allow-same-version

if [ "$BUMP" != "" ]; then
  # Bump version. This Will fail and stop the script if git is not clean
  npm --no-git-tag-version version "$BUMP"
  ESTRELLA_VERSION=$(node -e 'process.stdout.write(require("./package.json").version)')
fi

# build
echo "" ; echo "./build.js"
./build.js

# test
echo "" ; echo "./test/test.sh"
./test/test.sh

# publish to npm (fails and stops this script if the version is already published)
echo "" ; echo "npm publish"
npm publish

# commit, tag and push git
git commit -m "release v${ESTRELLA_VERSION}" dist package.json package-lock.json
git tag "v${ESTRELLA_VERSION}"
git push origin master "v${ESTRELLA_VERSION}"

CLEAN_EXIT=true
