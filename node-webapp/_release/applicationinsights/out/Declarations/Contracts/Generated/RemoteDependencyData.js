"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// THIS FILE WAS AUTOGENERATED
var Domain = require("./Domain");
"use strict";
/**
 * An instance of Remote Dependency represents an interaction of the monitored component with a remote component/service like SQL or an HTTP endpoint.
 */
var RemoteDependencyData = /** @class */ (function (_super) {
    __extends(RemoteDependencyData, _super);
    function RemoteDependencyData() {
        var _this = _super.call(this) || this;
        _this.ver = 2;
        _this.success = true;
        _this.properties = {};
        _this.measurements = {};
        return _this;
    }
    return RemoteDependencyData;
}(Domain));
module.exports = RemoteDependencyData;
//# sourceMappingURL=RemoteDependencyData.js.map