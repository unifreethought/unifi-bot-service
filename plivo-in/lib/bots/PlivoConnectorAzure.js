"use strict";
const PlivoConnector_1 = require("./PlivoConnector");
const qs = require("qs");
class PlivoConnectorAzure extends PlivoConnector_1.PlivoConnector {
    constructor(settings) {
        super(settings);
    }
    listen() {
        const botCtx = { log: console.log };
        const superListen = super.listen(botCtx);
        return (context, req) => {
            botCtx.log = context.log;
            req.body = qs.parse(req.body);
            const response = {};
            superListen(req, {
                send(status, body) {
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
                status(val) {
                    if (typeof val === "number") {
                        response.status = val;
                    }
                    return response.status || 200;
                },
                end() {
                    if (context) {
                        context.res = response;
                        context.done();
                        context = null;
                    }
                },
            });
        };
    }
}
exports.PlivoConnectorAzure = PlivoConnectorAzure;
//# sourceMappingURL=PlivoConnectorAzure.js.map