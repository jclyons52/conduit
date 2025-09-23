"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLogger = exports.ConsoleLogger = void 0;
var ConsoleLogger = /** @class */ (function () {
    function ConsoleLogger(prefix) {
        this.prefix = prefix;
    }
    ConsoleLogger.prototype.log = function (message) {
        console.log("".concat(this.prefix, ": ").concat(message));
    };
    ConsoleLogger.prototype.error = function (message) {
        console.error("".concat(this.prefix, ": ERROR - ").concat(message));
    };
    ConsoleLogger.prototype.info = function (message) {
        console.info("".concat(this.prefix, ": INFO - ").concat(message));
    };
    return ConsoleLogger;
}());
exports.ConsoleLogger = ConsoleLogger;
var FileLogger = /** @class */ (function () {
    function FileLogger(prefix, filePath) {
        this.prefix = prefix;
        this.filePath = filePath;
    }
    FileLogger.prototype.log = function (message) {
        // In real implementation, would write to file
        console.log("[FILE:".concat(this.filePath, "] ").concat(this.prefix, ": ").concat(message));
    };
    FileLogger.prototype.error = function (message) {
        console.log("[FILE:".concat(this.filePath, "] ").concat(this.prefix, ": ERROR - ").concat(message));
    };
    FileLogger.prototype.info = function (message) {
        console.log("[FILE:".concat(this.filePath, "] ").concat(this.prefix, ": INFO - ").concat(message));
    };
    return FileLogger;
}());
exports.FileLogger = FileLogger;
