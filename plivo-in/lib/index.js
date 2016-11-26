"use strict";
const UnifiConnector_1 = require("./bots/UnifiConnector");
const UnifiConnectorAzure_1 = require("./bots/UnifiConnectorAzure");
const builder = require("botbuilder");
const restify = require("restify");
// import stringify from "json-stringify-safe";
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
    let context = { log: console.log };
    let connector = new UnifiConnector_1.UnifiConnector(settings, context);
    let bot = makeBot(connector);
    server.post("/api/plivo-in", connector.listen());
}
else {
    module.exports = (context, req) => {
        let connector = new UnifiConnectorAzure_1.UnifiConnectorAzure(settings, context);
        let bot = makeBot(connector);
        connector.listenAzure(req);
    };
}
function makeBot(connector) {
    const bot = new builder.UniversalBot(connector);
    const intents = new builder.IntentDialog()
        .matches(/^@unifibot help/i, (session) => {
        session.send("Hello! I\"m the UNIFI Bot. Right now my functions are:\n\n"
            + "1. Sending text messages (SMS) to groups of users. e.g.: "
            + "Text members at 3PM \"UNIFI Forum tonight at 6 behind Chat\'s\"!");
    })
        .matches(/^@unifibot echo/, (session, args) => {
        const filter = new RegExp('^@unifibot echo (.*)');
        const matches = session.message.text.match(filter);
        if (matches) {
            session.send(matches[1]);
        }
    })
        .onDefault((session) => {
        const message = new builder.Message()
            .address(JSON.parse(process.env.SlackAddress))
            .text(`Text from ${session.message.address.user.id}: ${session.message.text}`);
        bot.send(message);
    });
    bot.dialog("/", intents);
    return bot;
}
//# sourceMappingURL=index.js.map