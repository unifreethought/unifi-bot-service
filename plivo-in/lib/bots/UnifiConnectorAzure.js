"use strict";
const UnifiConnector_1 = require("./UnifiConnector");
const qs = require("qs");
class UnifiConnectorAzure extends UnifiConnector_1.UnifiConnector {
    constructor(settings) {
        super(settings);
    }
    listen() {
        const botCtx = { log: console.log };
        const superListen = super.listen(botCtx);
        return (context, req) => {
            botCtx.log = context.log;
            context.log('Connected to: ', UnifiConnector_1.ConnectionType[this.unifiSettings.connectedTo]);
            switch (this.unifiSettings.connectedTo) {
                case UnifiConnector_1.ConnectionType.BotService:
                    break;
                case UnifiConnector_1.ConnectionType.Plivo:
                    // Plivo sends requests querystring formatted in the body.
                    context.log('Plivo request raw body: ', req.body);
                    req.body = qs.parse(req.body);
                    context.log('Plivo request body: ', req.body);
                    break;
                default:
                    break;
            }
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
                    if (typeof val === 'number') {
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
exports.UnifiConnectorAzure = UnifiConnectorAzure;
//# sourceMappingURL=UnifiConnectorAzure.js.map