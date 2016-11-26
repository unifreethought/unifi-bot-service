"use strict";
const UnifiConnector_1 = require("./UnifiConnector");
const qs = require("qs");
class UnifiConnectorAzure extends UnifiConnector_1.UnifiConnector {
    constructor(settings, context) {
        super(settings, context);
    }
    listenAzure(req) {
        switch (this.unifiSettings.connectedTo) {
            case UnifiConnector_1.ConnectionType.BotService:
                break;
            case UnifiConnector_1.ConnectionType.Plivo:
                // Plivo sends requests querystring formatted in the body.
                this.context.log('Plivo request raw body: ', req.body);
                req.body = qs.parse(req.body);
                this.context.log('Plivo request body: ', req.body);
                break;
            default:
                break;
        }
        const response = {};
        (super.listen())(req, {
            send(status, body) {
                response.status = status;
                if (body) {
                    response.body = body;
                }
                this.context.res = response;
                this.context.done();
            },
            status(val) {
                if (typeof val === 'number') {
                    response.status = val;
                }
                return response.status || 200;
            },
            end() {
                this.context.res = response;
                this.context.done();
            },
        });
    }
}
exports.UnifiConnectorAzure = UnifiConnectorAzure;
//# sourceMappingURL=UnifiConnectorAzure.js.map