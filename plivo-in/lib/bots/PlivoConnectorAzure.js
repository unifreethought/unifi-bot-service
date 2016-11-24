"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var PlivoConnector_1 = require("./PlivoConnector");
var PlivoConnectorAzure = (function (_super) {
    __extends(PlivoConnectorAzure, _super);
    function PlivoConnectorAzure(settings) {
        return _super.call(this, settings) || this;
    }
    PlivoConnectorAzure.prototype.listen = function () {
        var _listen = _super.prototype.listen;
        return function (context, req) {
            var response = {};
            _listen(context.log)(req, {
                send: function (status, body) {
                    if (context) {
                        response.status = status;
                        if (body) {
                            response.body = body;
                        }
                        context.res = response;
                        context.done();
                        context = null;
                    }
                },
                status: function (val) {
                    if (typeof val === 'number') {
                        response.status = val;
                    }
                    return response.status || 200;
                },
                end: function () {
                    if (context) {
                        context.res = response;
                        context.done();
                        context = null;
                    }
                }
            });
        };
    };
    return PlivoConnectorAzure;
}(PlivoConnector_1.PlivoConnector));
exports.PlivoConnectorAzure = PlivoConnectorAzure;
//# sourceMappingURL=PlivoConnectorAzure.js.map