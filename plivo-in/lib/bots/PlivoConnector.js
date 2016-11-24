"use strict";
const async = require("async");
const request = require("request");
class PlivoConnector {
    constructor(settings) {
        this.settings = settings;
    }
    listen(context = { log: console.log }) {
        return (req, res) => {
            if (req.body) {
                this.handlePlivoRequest(context, req, res);
            }
            else {
                let requestData = "";
                req.on("data", (chunk) => {
                    requestData += chunk;
                });
                req.on("end", () => {
                    req.body = JSON.parse(requestData);
                    this.handlePlivoRequest(context, req, res);
                });
            }
        };
    }
    send(messages, done) {
        async.eachSeries(messages, (msg, cb) => {
            try {
                const reqUrl = `https://api.plivo.com/v1/Account/${this.settings.plivoAuthId}/Message/`;
                const auth = {
                    pass: this.settings.plivoAuthToken,
                    user: this.settings.plivoAuthId,
                };
                const options = {
                    json: {
                        dst: msg.address.user.id,
                        log: true,
                        src: this.settings.plivoNumber,
                        text: msg.text,
                        type: "sms",
                    },
                    auth,
                };
                request.post(reqUrl, options, (err, response, body) => {
                    if (!err && response.statusCode >= 400) {
                        err = new Error(`Unable to send message over Plivo to ${options.json.dst}`);
                    }
                    cb(err);
                });
            }
            catch (e) {
                cb(e);
            }
        }, done);
    }
    startConversation(address, done) {
        const adr = clone(address);
        if (address && address.bot && address.bot.id && address.user && address.user.id) {
            adr.conversation = { id: `${address.bot.id}-${address.user.id}` };
        }
        else {
            adr.conversation = { id: "sms" };
        }
        done(null, adr);
    }
    onEvent(handler) {
        this.handler = handler;
    }
    handlePlivoRequest(context, req, res) {
        // In case future authentication code is added, add it here.
        // Plivo doesn't use JWT, so we defer authentication to the listener.
        // In the case of Azure Functions, use a Function Key / API Key.
        const plivoMsg = req.body;
        const message = ({
            address: {
                bot: { id: plivoMsg.To },
                channelId: "sms",
                conversation: { id: `${plivoMsg.From}-${plivoMsg.To}` },
                user: { id: plivoMsg.From },
            },
            attachments: [],
            entities: [],
            source: "sms",
            sourceEvent: { id: plivoMsg.MessageUUID },
            text: plivoMsg.Text,
            timestamp: (new Date()).toISOString(),
            type: "message",
        });
        this.handler([message]);
        res.status(200);
        res.end();
    }
}
exports.PlivoConnector = PlivoConnector;
function clone(obj) {
    const cpy = {};
    if (obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cpy[key] = obj[key];
            }
        }
    }
    return cpy;
}
//# sourceMappingURL=PlivoConnector.js.map