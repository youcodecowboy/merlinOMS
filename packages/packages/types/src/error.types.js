"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.APIError = void 0;
var APIError = /** @class */ (function (_super) {
    __extends(APIError, _super);
    function APIError(statusCode, code, message) {
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.code = code;
        _this.name = 'APIError';
        return _this;
    }
    return APIError;
}(Error));
exports.APIError = APIError;
var ErrorCode;
(function (ErrorCode) {
    // Authentication errors
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    // Validation errors
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    // Resource errors
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    // State errors
    ErrorCode["INVALID_STATE"] = "INVALID_STATE";
    ErrorCode["INVALID_TRANSITION"] = "INVALID_TRANSITION";
    // System errors
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    // Business logic errors
    ErrorCode["BUSINESS_RULE_VIOLATION"] = "BUSINESS_RULE_VIOLATION";
    ErrorCode["INSUFFICIENT_INVENTORY"] = "INSUFFICIENT_INVENTORY";
    ErrorCode["INVALID_SKU"] = "INVALID_SKU";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
