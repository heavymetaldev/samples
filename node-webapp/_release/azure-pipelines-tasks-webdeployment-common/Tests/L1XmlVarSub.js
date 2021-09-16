var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var xmlSubstitutionUtility = require('azure-pipelines-tasks-webdeployment-common/xmlvariablesubstitutionutility.js');
var path = require('path');
function xmlVarSub() {
    return __awaiter(this, void 0, void 0, function* () {
        var tags = ["applicationSettings", "appSettings", "connectionStrings", "configSections"];
        var configFiles = [path.join(__dirname, 'L1XmlVarSub/Web_test.config'), path.join(__dirname, 'L1XmlVarSub/Web_test.Debug.config')];
        var variableMap = {
            'conntype': 'new_connType',
            "MyDB": "TestDB",
            'webpages:Version': '1.1.7.3',
            'xdt:Transform': 'DelAttributes',
            'xdt:Locator': 'Match(tag)',
            'DefaultConnection': "Url=https://primary;Database=db1;ApiKey=11111111-1111-1111-1111-111111111111;Failover = {Url:'https://secondary', ApiKey:'11111111-1111-1111-1111-111111111111'}",
            'OtherDefaultConnection': 'connectionStringValue2',
            'ParameterConnection': 'New_Connection_String From xml var subs',
            'connectionString': 'replaced_value',
            'invariantName': 'System.Data.SqlServer',
            'blatvar': 'ApplicationSettingReplacedValue',
            'log_level': 'error,warning',
            'Email:ToOverride': ''
        };
        var parameterFilePath = path.join(__dirname, 'L1XmlVarSub/parameters_test.xml');
        for (var configFile of configFiles) {
            yield xmlSubstitutionUtility.substituteXmlVariables(configFile, tags, variableMap, parameterFilePath);
        }
    });
}
xmlVarSub();
