"use strict";
const PlivoConnector_1 = require("./PlivoConnector");
class PlivoConnectorAzure extends PlivoConnector_1.PlivoConnector {
    constructor(settings) {
        super(settings);
    }
    listen() {
        var _context = { log: (_) => { } };
        var _listen = super.listen(_context);
        return function (context, req) {
            _context.log = context.log;
            context.log('Test log on Azure.');
            context.log(`Received request with body ${JSON.stringify(req)}`);
            if (!req.body) {
                req.body = {
                    From: req.query.From,
                    To: req.query.To,
                    Text: req.query.Text,
                    Type: req.query.Type,
                    MessageUUID: req.query.MessageUUID,
                };
            }
            context.log("req.query = ", req.query);
            context.log("req.body = ", req.body);
            // Plivo sends all of the arguments as query parameters, and the body is 
            var response = {};
            _listen(req, {
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
    }
}
exports.PlivoConnectorAzure = PlivoConnectorAzure;
//# sourceMappingURL=PlivoConnectorAzure.js.map