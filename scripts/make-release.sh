#!/usr/bin/env bash

set -euo pipefail

version=$(jq -r .version package.json)
release_name="typingfreaks-v$version"

# if git ls-remote --tags --exit-code origin "v$version"; then
#     echo "Release $release_name already exists"
#     exit 1
# fi

npm run build

function cleanup {
    rm -rf "$release_name"
    rm -f "$release_name.zip"
}

trap cleanup EXIT

mkdir "$release_name"
cp dist/bundle.{js,js.map} "$release_name"
for file in $(git ls-files dist); do
    cp "$file" "$release_name"
done
zip -r "$release_name.zip" "$release_name"

gh release create -d --notes "" "v$version" "$release_name.zip"
