echo "Hello from DEPLOY.ps1!"
write-output "otuput maybe?"

# @if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

# :: ----------------------
# :: KUDU Deployment Script
# :: Version: 1.0.17
# :: ----------------------

# :: Prerequisites
# :: -------------

# :: Verify node.js installed
if (!(get-command "node")) {
  throw "Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment."
}

# :: Setup
# :: -----

# setlocal enabledelayedexpansion

# SET ARTIFACTS=%~dp0%..\artifacts

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

if (!$env:KUDU_SYNC_CMD) {
  #   :: Install kudu sync
  echo "Installing Kudu Sync"
  npm install kudusync -g --silent
  if ($lastExitCode -ne 0) { throw "Failed to install KuduSync" }

  #   :: Locally just running "kuduSync" would also work
  $env:KUDU_SYNC_CMD = "$env:appdata\npm\kuduSync.cmd"
}

# :: Utility Functions
# :: -----------------

# :SelectNodeVersion

# IF DEFINED KUDU_SELECT_NODE_VERSION_CMD (
#   :: The following are done only on Windows Azure Websites environment
#   call %KUDU_SELECT_NODE_VERSION_CMD% "%DEPLOYMENT_SOURCE%" "%DEPLOYMENT_TARGET%" "%DEPLOYMENT_TEMP%"
#   IF !ERRORLEVEL! NEQ 0 goto error

#   IF EXIST "%DEPLOYMENT_TEMP%\__nodeVersion.tmp" (
#     SET /p NODE_EXE=<"%DEPLOYMENT_TEMP%\__nodeVersion.tmp"
#     IF !ERRORLEVEL! NEQ 0 goto error
#   )
  
#   IF EXIST "%DEPLOYMENT_TEMP%\__npmVersion.tmp" (
#     SET /p NPM_JS_PATH=<"%DEPLOYMENT_TEMP%\__npmVersion.tmp"
#     IF !ERRORLEVEL! NEQ 0 goto error
#   )

#   IF NOT DEFINED NODE_EXE (
#     SET NODE_EXE=node
#   )

#   SET NPM_CMD="!NODE_EXE!" "!NPM_JS_PATH!"
# ) ELSE (
$env:NPM_CMD = "npm"
$env:NODE_EXE = "node"
# )

# goto :EOF

# ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
# :: Deployment
# :: ----------

echo "Handling node.js deployment."

# :: 1. KuduSync
if ($env:IN_PLACE_DEPLOYMENT -ne "1") {
  & $env:KUDU_SYNC_CMD -v 50 -f $env:DEPLOYMENT_SOURCE -t $env:DEPLOYMENT_TARGET -n $env:NEXT_MANIFEST_PATH -p $env:PREVIOUS_MANIFEST_PATH -i ".git;.hg;.deployment;deploy.cmd"
  if ($lastExitCode) { throw "kuduSync failed." }
}

# :: 2. Select node version
# call :SelectNodeVersion

# :: 3. Install npm packages
if (test-path "$env:DEPLOYMENT_TARGET\package.json") {
  pushd $env:DEPLOYMENT_TARGET
  try {
    & $env:NPM_CMD install --production
    if ($lastExitCode -ne 0) { throw "npm install failed." }
  }
  finally {
    popd
  }
}

# ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
# goto end

# :: Execute command routine that will echo out when error
# :ExecuteCmd
# setlocal
# set _CMD_=%*
# call %_CMD_%
# if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
# exit /b %ERRORLEVEL%

# :error
# endlocal
# echo An error has occurred during web site deployment.
# call :exitSetErrorLevel
# call :exitFromFunction 2>nul

# :exitSetErrorLevel
# exit /b 1

# :exitFromFunction
# ()

# :end
# endlocal
# echo Finished successfully.
