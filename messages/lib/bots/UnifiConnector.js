"use strict";
const botbuilder_1 = require("botbuilder");
const async = require("async");
const request = require("request");
const _ = require("lodash");
const PlivoChannelId = 'sms';
class UnifiConnector extends botbuilder_1.ChatConnector {
    constructor(unifiSettings, context) {
        super(unifiSettings.chatSettings);
        this.unifiSettings = unifiSettings;
        this.context = context;
    }
    listen() {
        switch (this.unifiSettings.connectedTo) {
            case ConnectionType.BotService:
                return super.listen();
            case ConnectionType.Plivo:
                return (req, res) => {
                    if (req.body) {
                        this.handlePlivoRequest(req, res);
                    }
                    else {
                        let requestData = '';
                        req.on('data', (chunk) => {
                            requestData += chunk;
                        });
                        req.on('end', () => {
                            req.body = JSON.parse(requestData);
                            this.handlePlivoRequest(req, res);
                        });
                    }
                };
            default:
                throw new Error('No connection type specified.');
        }
    }
    send(messages, done) {
        const plivoMessages = messages.filter((msg) => msg.address.channelId === PlivoChannelId);
        const grouped = _.groupBy(messages, (msg) => {
            return channelIdToType(msg.address.channelId);
        });
        _.each(grouped, (value, key) => {
            console.log('key = ', key);
            console.log('value = ', value);
            // key is a string here, e.g.: "0", and we double-lookup to convert
            // from the string to the name associated with it, to the number.
            switch (ConnectionType[ConnectionType[key]]) {
                case ConnectionType.BotService:
                    super.send(messages, done);
                    break;
                case ConnectionType.Plivo:
                    const plivoSettings = this.unifiSettings.plivoSettings;
                    async.eachSeries(messages, (msg, cb) => {
                        try {
                            const reqUrl = `https://api.plivo.com/v1/Account/${plivoSettings.plivoAuthId}/Message/`;
                            const auth = {
                                pass: plivoSettings.plivoAuthToken,
                                user: plivoSettings.plivoAuthId,
                            };
                            const options = {
                                json: {
                                    dst: msg.address.user.id,
                                    log: true,
                                    src: plivoSettings.plivoNumber,
                                    text: msg.text,
                                    type: 'sms',
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
                    break;
                default:
                    done(new Error('No connection type specified.'));
            }
        });
    }
    startConversation(address, done) {
        switch (channelIdToType(address.channelId)) {
            case ConnectionType.BotService:
                super.startConversation(address, done);
                break;
            case ConnectionType.Plivo:
                const adr = clone(address);
                if (address && address.bot && address.bot.id && address.user && address.user.id) {
                    adr.conversation = { id: `${address.bot.id}-${address.user.id}` };
                }
                else {
                    adr.conversation = { id: 'plivo' };
                }
                done(null, adr);
                break;
            default:
                done(new Error('No connection type specified'), address);
        }
    }
    onEvent(handler) {
        this.handler = handler;
    }
    handlePlivoRequest(req, res) {
        // In case future authentication code is added, add it here.
        // Plivo doesn't use JWT, so we defer authentication to the listener.
        // In the case of Azure Functions, use a Function Key / API Key.
        const plivoMsg = req.body;
        const message = ({
            address: {
                bot: { id: plivoMsg.To },
                channelId: PlivoChannelId,
                conversation: { id: `${plivoMsg.From}-${plivoMsg.To}` },
                user: { id: plivoMsg.From },
            },
            attachments: [],
            entities: [],
            source: 'plivo',
            sourceEvent: { id: plivoMsg.MessageUUID },
            text: plivoMsg.Text,
            timestamp: (new Date()).toISOString(),
            type: 'message',
        });
        this.handler([message]);
        res.status(200);
        res.end();
    }
}
exports.UnifiConnector = UnifiConnector;
var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["Plivo"] = 0] = "Plivo";
    ConnectionType[ConnectionType["BotService"] = 1] = "BotService";
})(ConnectionType = exports.ConnectionType || (exports.ConnectionType = {}));
function channelIdToType(channelId) {
    switch (channelId) {
        case PlivoChannelId:
            return ConnectionType.Plivo;
        default:
            return ConnectionType.BotService;
    }
}
exports.channelIdToType = channelIdToType;
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
//# sourceMappingURL=UnifiConnector.js.map