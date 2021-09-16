declare var msdeployUtility: any;
declare var errorMessages: {
    ERROR_INSUFFICIENT_ACCESS_TO_SITE_FOLDER: string;
    "An error was encountered when processing operation 'Delete Directory' on 'D:\\home\\site\\wwwroot\\app_data\\jobs\\continous'": string;
    "Cannot delete file main.dll. Error code: FILE_IN_USE": string;
    "transport connection": string;
    "error code: ERROR_CONNECTION_TERMINATED": string;
};
declare function checkParametersIfPresent(argumentString: string, argumentCheckArray: Array<string>): boolean;
declare var defaultMSBuildPackageArgument: string;
declare var packageWithSetParamArgument: string;
declare var folderPackageArgument: string;
declare var packageWithExcludeAppDataArgument: string;
declare var warDeploymentArgument: string;
declare var overrideRetryArgument: string;
