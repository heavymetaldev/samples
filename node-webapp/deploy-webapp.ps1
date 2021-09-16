write-host "cleaning _release dir"
npx rimraf _release
write-host "copying files from src/"
robocopy src/ _release/ -XD node_modules

pushd _release

try {
write-host "git init"
git init .
git remote add webapp https://hmdev-sample-webapp.scm.azurewebsites.net:443/hmdev-sample-webapp.git
write-host "commiting"
git add .
git commit -m "release"

write-host "pushing"
git push webapp master:deploy --force
} finally {
    popd
}

write-host "DONE"