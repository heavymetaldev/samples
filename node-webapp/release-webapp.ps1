cp src/* release/ -force -Recurse

pushd release

try {
git add .
git commit -m "release"
git push webapp
} finally {
    popd
}