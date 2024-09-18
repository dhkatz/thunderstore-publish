#!/bin/bash

function setup() {
  echo "::group::Set up environment"

  # If the TS_PATH var is set and not empty
  if [[ -n "$TS_PATH" ]]; then
    echo "::debug::TS_PATH found"
    p=$(echo $TS_PATH | sed 's:$/*::') #trim any trailing '/'
  else
    echo "::debug::TS_PATH not set"
    p="."
  fi

  # Move files to the dist directory for the tcli

  # Move the README if it exists
  if [[ -n "$TS_README" && -e "$TS_README" ]]; then
    echo "Copying README from $TS_README"
    cp "$TS_README" "/"
  elif [[ -e "$p/README.md" ]]; then
    echo "Copying README"
    cp "$p/README.md" "/"
  fi

  if [[ -n "$TS_ICON" && -e "$TS_ICON" ]]; then
    echo "Copying icon from $TS_ICON"
    cp "$TS_ICON" "/"
  elif [[ -e "$p/icon.png" ]]; then
    echo "Copying icon"
    cp "$p/icon.png" "/"
  fi

  echo "::endgroup::"
}

function configure(){
  cd "/"

  echo "::group::Configure tcli"

  #tcli usage based off of https://github.com/R2Northstar/Northstar/blob/d8ad8f12f8bca1e8de96f5d7163f71997d487218/.github/workflows/build.yml#L132-L192
  echo "Init tcli config"
  tcli init --package-name ${TS_NAME} --package-namespace ${TS_NAMESPACE} --package-version ${TS_VERSION#v}
  
  deno run --allow-net --allow-env --allow-read --allow-write manifest.ts

  echo "Done config edit"
  echo
  echo "::debug::$(cat thunderstore.toml)"
  echo "::endgroup::"
}


function publish() {
  if [[ -n "$TS_REPO" ]]; then
    repo="$TS_REPO"
  elif [[ -n "$TS_DEV" ]]; then
    repo="https://thunderstore.dev"
  else
    repo="https://thunderstore.io"
  fi

  # skip the build if there is a prebuilt package provided
  if [[ -n "$TS_FILE" ]]; then
    echo "::group::Publish package"
    echo "Publish to $repo"
    file="dist/$TS_FILE"
  else
    echo "::group::Build and publish"
    tcli build
    echo "Publish to $repo"
    file="build/*.zip"
  fi

  out=$(tcli publish --repository ${repo} --file ${file}) #capture the output to get the URL
  # A bad response from the server doesn't exit with a non-zero status code
  if [[ $? -ne 0 ]]; then
    echo "::error::$(echo ${out} | grep -Eo ERROR:.*)"
    exit 1
  fi
  echo "url=$(echo ${out} | grep -Eo "https.*")" >> $GITHUB_OUTPUT
  echo "Done!"
  echo "::endgroup::"
}

set -e
setup
configure
set +e # Turn this off so we can see the output from tcli publish
publish


