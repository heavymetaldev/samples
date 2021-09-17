echo "starting DEPLOY.ps1"

# @if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

function verifyPrerequisites() {
  # :: Prerequisites
  # :: -------------

  # :: Verify node.js installed
  if (!(get-command "node")) {
    throw "Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment."
  }
}

# :: ----------------------
# :: KUDU Deployment Script
# :: Version: 1.0.17
# :: ----------------------

function setupVariables() {

  # :: Setup
  # :: -----

  # setlocal enabledelayedexpansion

  $env:ARTIFACTS = "($PSScriptRoot)\..\artifacts"

  # see WellKnownEnvironmentVariables: https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Deployment/WellKnownEnvironmentVariables.cs
  if (!$env:DEPLOYMENT_SOURCE) { 
    $env:DEPLOYMENT_SOURCE = $PSScriptRoot
  }

  if (!$env:DEPLOYMENT_TARGET) {
    $env:DEPLOYMENT_TARGET = "$env:ARTIFACTS\wwwroot"
  } 

  if (!$env:NEXT_MANIFEST_PATH) {
    $env:NEXT_MANIFEST_PATH = "$env:ARTIFACTS\manifest"

    if (!$env:PREVIOUS_MANIFEST_PATH) {
      $env:PREVIOUS_MANIFEST_PATH = "$env:ARTIFACTS\manifest"
    }
  }
}

function selectNodeVersion() {

  if ($env:KUDU_SELECT_NODE_VERSION_CMD) {
    #   :: The following are done only on Windows Azure Websites environment
    echo "trying to determine node version via '$env:KUDU_SELECT_NODE_VERSION_CMD'"
    cmd /C $env:KUDU_SELECT_NODE_VERSION_CMD $env:DEPLOYMENT_SOURCE $env:DEPLOYMENT_TARGET $env:DEPLOYMENT_TEMP
    if ($lastExitCode -ne 0) { throw "failed to select node version" }

    if (test-path "$env:DEPLOYMENT_TEMP\__nodeVersion.tmp") {
      $env:NODE_EXE = cat "$env:DEPLOYMENT_TEMP\__nodeVersion.tmp"    
      $env:PATH="$(split-path -parent $env:NODE_EXE);$env:PATH"
    }
  
    if (test-path "$env:DEPLOYMENT_TEMP\__npmVersion.tmp") {
      $env:NPM_JS_PATH = cat "$env:DEPLOYMENT_TEMP\__npmVersion.tmp"
      $npmBinPath = $env:NPM_JS_PATH.Replace("\node_modules\npm\bin\npm-cli.js", "")
      $env:PATH="$npmBinPath;$env:PATH"
    }

    if (!$env:NODE_EXE) {
      $env:NODE_EXE = "node"
    }

    $env:NPM_CMD = "$env:NODE_EXE $env:NPM_JS_PATH"
  }
  else {
    $env:NPM_CMD = "npm"
    $env:NODE_EXE = "node"
  }

  echo "NPM_CMD=$env:NPM_CMD"
  echo "NODE_EXE=$env:NODE_EXE"
}

function runKudSync($version = $null) {
  if ($env:IN_PLACE_DEPLOYMENT -eq "1") {
    echo "IN_PLACE_DEPLOYMENT enabled"
    return
  }
  if (!$env:KUDU_SYNC_CMD -or $version -ne $null) {
    #   :: Install kudu sync
    if ($version -eq $null) { $version = "kudusync" }
    echo "Installing Kudu Sync from $version"
    npm install $version -g --silent
    if ($lastExitCode -ne 0) { throw "Failed to install KuduSync" }

    # $env:KUDU_SYNC_CMD = "kudusync"
    $env:KUDU_SYNC_CMD = "$env:APPDATA\npm\kuduSync.cmd"
    echo "KUDU_SYNC_CMD = $env:KUDU_SYNC_CMD"    
  }
  else {
    echo "Found Kudu Sync at: $env:KUDU_SYNC_CMD"
  }
  
  echo "$env:KUDU_SYNC_CMD -v 50 -f $env:DEPLOYMENT_SOURCE -t $env:DEPLOYMENT_TARGET -n $env:NEXT_MANIFEST_PATH -p $env:PREVIOUS_MANIFEST_PATH -i '.git;.hg;.deployment;deploy.cmd'"
  & $env:KUDU_SYNC_CMD -v 50 -f $env:DEPLOYMENT_SOURCE -t $env:DEPLOYMENT_TARGET -n $env:NEXT_MANIFEST_PATH -p $env:PREVIOUS_MANIFEST_PATH -i ".git;.hg;.deployment;deploy.cmd"
  if ($lastExitCode -ne 0) { throw "kuduSync failed." }  
}

function restore() {
  # :: 3. Install npm packages
  if (test-path "$env:DEPLOYMENT_TARGET\package.json") {
    pushd $env:DEPLOYMENT_TARGET
    try {
      echo "restoring node_modules"
      npm ci --production
      if ($lastExitCode -ne 0) { throw "npm install failed." }
    }
    finally {
      popd
    }
  }
}

function setAppOffline() {
  echo "creating app_offline.htm"
  echo "<html><body>App is currently offline.</body></html>" > "$env:DEPLOYMENT_TARGET/app_offline.htm"
}

function setAppOnline() {
  echo "removing app_offline.htm"
    
  if (test-path "$env:DEPLOYMENT_TARGET/app_offline.htm") { 
    rm "$env:DEPLOYMENT_TARGET/app_offline.htm"
  }
}

# ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
# :: Deployment
# :: ----------

echo "Handling node.js deployment."
verifyPrerequisites
setupVariables
selectNodeVersion

setAppOffline

runKudSync -version "qbikez/kudusync"

restore

setAppOnline

echo "Finished successfully."
