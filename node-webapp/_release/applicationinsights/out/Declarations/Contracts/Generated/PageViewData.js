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
var EventData = require("./EventData");
"use strict";
/**
 * An instance of PageView represents a generic action on a page like a button click. It is also the base type for PageView.
 */
var PageViewData = /** @class */ (function (_super) {
    __extends(PageViewData, _super);
    function PageViewData() {
        var _this = _super.call(this) || this;
        _this.ver = 2;
        _this.properties = {};
        _this.measurements = {};
        return _this;
    }
    return PageViewData;
}(EventData));
module.exports = PageViewData;
//# sourceMappingURL=PageViewData.js.map