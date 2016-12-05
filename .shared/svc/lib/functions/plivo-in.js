"use strict";
const UnifiConnector_1 = require("../bots/UnifiConnector");
const UnifiConnectorAzure_1 = require("../bots/UnifiConnectorAzure");
const botbuilder_1 = require("botbuilder");
const builder = require("botbuilder");
const restify = require("restify");
const useEmulator = (process.env.NODE_ENV === "development");
const settings = {
    chatSettings: {
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword,
        openIdMetadata: process.env.BotOpenIdMetadata,
        stateEndpoint: process.env.BotStateEndpoint,
    },
    connectedTo: UnifiConnector_1.ConnectionType.Plivo,
    plivoSettings: {
        plivoAuthId: process.env.PlivoAuthID,
        plivoAuthToken: process.env.PlivoAuthToken,
        plivoNumber: process.env.PlivoNumber,
    },
};
if (useEmulator) {
    const server = restify.createServer();
    server.listen(3978, () => {
        console.log("test bot endpont at http://localhost:3978/api/plivo-in");
    });
    let context = { log: console.log, done: () => { } };
    let connector = new UnifiConnector_1.UnifiConnector(settings, context);
    let bot = makeBot(connector);
    server.post("/api/plivo-in", connector.listen());
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (context, req) => {
    let connector = new UnifiConnectorAzure_1.UnifiConnectorAzure(settings, context);
    let bot = makeBot(connector);
    connector.listenAzure(req);
};
function makeBot(connector) {
    const bot = new botbuilder_1.UniversalBot(connector);
    const intents = new builder.IntentDialog()
        .onDefault((session) => {
        const message = new builder.Message()
            .address(JSON.parse(process.env.SlackAddress))
            .text(`Text from ${session.message.address.user.id}: ${session.message.text}`);
        bot.send(message);
    });
    bot.dialog("/", intents);
    return bot;
}
//# sourceMappingURL=plivo-in.js.map