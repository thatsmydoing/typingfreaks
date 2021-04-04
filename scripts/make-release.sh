#!/usr/bin/env bash

set -euo pipefail

if [[ "${GITHUB_REF:-}" == refs/tags/* ]]; then
    version=${GITHUB_REF/refs\/tags\//}
else
    version="v$(jq -r .version package.json)"
    if git ls-remote --tags --exit-code origin "$version"; then
        echo "Release $release_name already exists"
        exit 1
    fi
fi
release_name="typingfreaks-$version"

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

gh release create -d --notes "" "$version" "$release_name.zip"
