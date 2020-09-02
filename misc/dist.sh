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

# checkout products so that npm version doesn't fail.
# These are regenerated later anyways.
git checkout -- dist/estrella.js dist/estrella.js.map

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

function fn_onexit {
  if $CLEAN_EXIT; then
    exit
  fi
  if [ "$(git rev-parse HEAD)" != "$GIT_TREE_HASH" ]; then
    echo "Rolling back git (to $GIT_TREE_HASH)"
    git reset --hard "$GIT_TREE_HASH"
  fi
}
trap fn_onexit EXIT

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
git commit -am "release v${ESTRELLA_VERSION}"
git tag "v${ESTRELLA_VERSION}"
git push origin master "v${ESTRELLA_VERSION}"

CLEAN_EXIT=true
