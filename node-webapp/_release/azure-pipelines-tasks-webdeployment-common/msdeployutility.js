"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebDeployErrorCode = exports.redirectMSDeployErrorToConsole = exports.getMSDeployFullPath = exports.getWebDeployArgumentsString = exports.getMSDeployCmdArgs = void 0;
const Q = require("q");
const tl = require("azure-pipelines-task-lib/task");
const fs = require("fs");
const path = require("path");
var winreg = require('winreg');
var parseString = require('xml2js').parseString;
const ERROR_FILE_NAME = "error.txt";
/**
 * Constructs argument for MSDeploy command
 *
 * @param   webAppPackage                   Web deploy package
 * @param   webAppName                      web App Name
 * @param   publishingProfile               Azure RM Connection Details
 * @param   removeAdditionalFilesFlag       Flag to set DoNotDeleteRule rule
 * @param   excludeFilesFromAppDataFlag     Flag to prevent App Data from publishing
 * @param   takeAppOfflineFlag              Flag to enable AppOffline rule
 * @param   virtualApplication              Virtual Application Name
 * @param   setParametersFile               Set Parameter File path
 * @param   additionalArguments             Arguments provided by user
 * @param   isParamFilePresentInPacakge     Flag to check Paramter.xml file
 * @param   isFolderBasedDeployment         Flag to check if given web package path is a folder
 *
 * @returns string
 */
function getMSDeployCmdArgs(webAppPackage, webAppName, publishingProfile, removeAdditionalFilesFlag, excludeFilesFromAppDataFlag, takeAppOfflineFlag, virtualApplication, setParametersFile, additionalArguments, isParamFilePresentInPacakge, isFolderBasedDeployment, useWebDeploy) {
    var msDeployCmdArgs = " -verb:sync";
    var webApplicationDeploymentPath = (virtualApplication) ? webAppName + "/" + virtualApplication : webAppName;
    if (isFolderBasedDeployment) {
        msDeployCmdArgs += " -source:IisApp=\"'" + webAppPackage + "'\"";
        msDeployCmdArgs += " -dest:iisApp=\"'" + webApplicationDeploymentPath + "'\"";
    }
    else {
        if (webAppPackage && webAppPackage.toLowerCase().endsWith('.war')) {
            tl.debug('WAR: webAppPackage = ' + webAppPackage);
            let warFile = path.basename(webAppPackage.slice(0, webAppPackage.length - '.war'.length));
            let warExt = webAppPackage.slice(webAppPackage.length - '.war'.length);
            tl.debug('WAR: warFile = ' + warFile);
            warFile = (virtualApplication) ? warFile + "/" + virtualApplication + warExt : warFile + warExt;
            tl.debug('WAR: warFile = ' + warFile);
            msDeployCmdArgs += " -source:contentPath=\"'" + webAppPackage + "'\"";
            // tomcat, jetty location on server => /site/webapps/
            tl.debug('WAR: dest = /site/webapps/' + warFile);
            msDeployCmdArgs += " -dest:contentPath=\"'/site/webapps/" + warFile + "'\"";
        }
        else {
            msDeployCmdArgs += " -source:package=\"'" + webAppPackage + "'\"";
            if (isParamFilePresentInPacakge) {
                msDeployCmdArgs += " -dest:auto";
            }
            else {
                msDeployCmdArgs += " -dest:contentPath=\"'" + webApplicationDeploymentPath + "'\"";
            }
        }
    }
    if (publishingProfile != null) {
        msDeployCmdArgs += ",ComputerName=\"'https://" + publishingProfile.publishUrl + "/msdeploy.axd?site=" + webAppName + "'\",";
        msDeployCmdArgs += "UserName=\"'" + publishingProfile.userName + "'\",Password=\"'" + publishingProfile.userPWD + "'\",AuthType=\"'Basic'\"";
    }
    if (isParamFilePresentInPacakge) {
        msDeployCmdArgs += " -setParam:name=\"'IIS Web Application Name'\",value=\"'" + webApplicationDeploymentPath + "'\"";
    }
    if (takeAppOfflineFlag) {
        msDeployCmdArgs += ' -enableRule:AppOffline';
    }
    if (useWebDeploy) {
        if (setParametersFile) {
            msDeployCmdArgs += " -setParamFile=" + setParametersFile + " ";
        }
        if (excludeFilesFromAppDataFlag) {
            msDeployCmdArgs += ' -skip:Directory=App_Data';
        }
    }
    additionalArguments = additionalArguments ? additionalArguments : ' ';
    msDeployCmdArgs += ' ' + additionalArguments;
    if (!(removeAdditionalFilesFlag && useWebDeploy)) {
        msDeployCmdArgs += " -enableRule:DoNotDeleteRule";
    }
    if (publishingProfile != null) {
        var userAgent = tl.getVariable("AZURE_HTTP_USER_AGENT");
        if (userAgent) {
            msDeployCmdArgs += ' -userAgent:' + userAgent;
        }
    }
    tl.debug('Constructed msDeploy comamnd line arguments');
    return msDeployCmdArgs;
}
exports.getMSDeployCmdArgs = getMSDeployCmdArgs;
function getWebDeployArgumentsString(webDeployArguments, publishingProfile) {
    return __awaiter(this, void 0, void 0, function* () {
        return getMSDeployCmdArgs(webDeployArguments.package.getPath(), webDeployArguments.appName, publishingProfile, webDeployArguments.removeAdditionalFilesFlag, webDeployArguments.excludeFilesFromAppDataFlag, webDeployArguments.takeAppOfflineFlag, webDeployArguments.virtualApplication, webDeployArguments.setParametersFile, webDeployArguments.additionalArguments, yield webDeployArguments.package.isMSBuildPackage(), webDeployArguments.package.isFolder(), webDeployArguments.useWebDeploy);
    });
}
exports.getWebDeployArgumentsString = getWebDeployArgumentsString;
/**
 * Gets the full path of MSDeploy.exe
 *
 * @returns    string
 */
function getMSDeployFullPath() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var msDeployInstallPathRegKey = "\\SOFTWARE\\Microsoft\\IIS Extensions\\MSDeploy";
            var msDeployLatestPathRegKey = yield getMSDeployLatestRegKey(msDeployInstallPathRegKey);
            var msDeployFullPath = yield getMSDeployInstallPath(msDeployLatestPathRegKey);
            msDeployFullPath = msDeployFullPath + "msdeploy.exe";
            return msDeployFullPath;
        }
        catch (error) {
            tl.debug(error);
            return path.join(__dirname, "MSDeploy3.6/MSDeploy3.6", "msdeploy.exe");
        }
    });
}
exports.getMSDeployFullPath = getMSDeployFullPath;
function getMSDeployLatestRegKey(registryKey) {
    var defer = Q.defer();
    var regKey = new winreg({
        hive: winreg.HKLM,
        key: registryKey
    });
    regKey.keys(function (err, subRegKeys) {
        if (err) {
            defer.reject(tl.loc("UnabletofindthelocationofMSDeployfromregistryonmachineError", err));
            return;
        }
        var latestKeyVersion = 0;
        var latestSubKey;
        for (var index in subRegKeys) {
            var subRegKey = subRegKeys[index].key;
            var subKeyVersion = subRegKey.substr(subRegKey.lastIndexOf('\\') + 1, subRegKey.length - 1);
            if (!isNaN(subKeyVersion)) {
                var subKeyVersionNumber = parseFloat(subKeyVersion);
                if (subKeyVersionNumber > latestKeyVersion) {
                    latestKeyVersion = subKeyVersionNumber;
                    latestSubKey = subRegKey;
                }
            }
        }
        if (latestKeyVersion < 3) {
            defer.reject(tl.loc("UnsupportedinstalledversionfoundforMSDeployversionshouldbeatleast3orabove", latestKeyVersion));
            return;
        }
        defer.resolve(latestSubKey);
    });
    return defer.promise;
}
function getMSDeployInstallPath(registryKey) {
    var defer = Q.defer();
    var regKey = new winreg({
        hive: winreg.HKLM,
        key: registryKey
    });
    regKey.get("InstallPath", function (err, item) {
        if (err) {
            defer.reject(tl.loc("UnabletofindthelocationofMSDeployfromregistryonmachineError", err));
            return;
        }
        defer.resolve(item.value);
    });
    return defer.promise;
}
/**
 * 1. Checks if msdeploy during execution redirected any error to
 * error stream ( saved in error.txt) , display error to console
 * 2. Checks if there is file in use error , suggest to try app offline.
 */
function redirectMSDeployErrorToConsole() {
    var msDeployErrorFilePath = tl.getVariable('System.DefaultWorkingDirectory') + '\\' + ERROR_FILE_NAME;
    if (tl.exist(msDeployErrorFilePath)) {
        var errorFileContent = fs.readFileSync(msDeployErrorFilePath).toString();
        if (errorFileContent !== "") {
            if (errorFileContent.indexOf("ERROR_INSUFFICIENT_ACCESS_TO_SITE_FOLDER") !== -1) {
                tl.warning(tl.loc("Trytodeploywebappagainwithappofflineoptionselected"));
            }
            else if (errorFileContent.indexOf("An error was encountered when processing operation 'Delete Directory' on 'D:\\home\\site\\wwwroot\\app_data\\jobs'") !== -1) {
                tl.warning(tl.loc('WebJobsInProgressIssue'));
            }
            else if (errorFileContent.indexOf("FILE_IN_USE") !== -1) {
                tl.warning(tl.loc("Trytodeploywebappagainwithrenamefileoptionselected"));
            }
            else if (errorFileContent.indexOf("transport connection") != -1) {
                errorFileContent = errorFileContent + tl.loc("Updatemachinetoenablesecuretlsprotocol");
            }
            tl.error(errorFileContent);
        }
        tl.rmRF(msDeployErrorFilePath);
    }
}
exports.redirectMSDeployErrorToConsole = redirectMSDeployErrorToConsole;
function getWebDeployErrorCode(errorMessage) {
    if (errorMessage !== "") {
        if (errorMessage.indexOf("ERROR_INSUFFICIENT_ACCESS_TO_SITE_FOLDER") !== -1) {
            return "ERROR_INSUFFICIENT_ACCESS_TO_SITE_FOLDER";
        }
        else if (errorMessage.indexOf("An error was encountered when processing operation 'Delete Directory' on 'D:\\home\\site\\wwwroot\\app_data\\jobs") !== -1) {
            return "WebJobsInProgressIssue";
        }
        else if (errorMessage.indexOf("FILE_IN_USE") !== -1) {
            return "FILE_IN_USE";
        }
        else if (errorMessage.indexOf("transport connection") != -1) {
            return "transport connection";
        }
        else if (errorMessage.indexOf("ERROR_CONNECTION_TERMINATED") != -1) {
            return "ERROR_CONNECTION_TERMINATED";
        }
        else if (errorMessage.indexOf("ERROR_CERTIFICATE_VALIDATION_FAILED") != -1) {
            return "ERROR_CERTIFICATE_VALIDATION_FAILED";
        }
    }
    return "";
}
exports.getWebDeployErrorCode = getWebDeployErrorCode;
