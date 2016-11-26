"use strict";
const UnifiConnector_1 = require("./bots/UnifiConnector");
const UnifiConnectorAzure_1 = require("./bots/UnifiConnectorAzure");
const Intents = require("./intents");
const builder = require("botbuilder");
const stringify = require("json-stringify-safe");
const restify = require("restify");
const useEmulator = (process.env.NODE_ENV === 'development');
const settings = {
    chatSettings: {
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword,
        openIdMetadata: process.env.BotOpenIdMetadata,
        stateEndpoint: process.env.BotStateEndpoint,
    },
    connectedTo: UnifiConnector_1.ConnectionType.BotService,
    plivoSettings: {
        plivoAuthId: process.env.PlivoAuthID,
        plivoAuthToken: process.env.PlivoAuthToken,
        plivoNumber: process.env.PlivoNumber,
    },
};
if (useEmulator) {
    const server = restify.createServer();
    server.listen(3978, () => {
        console.log("test bot endpont at http://localhost:3978/api/messages");
    });
    let context = { log: console.log };
    let connector = new UnifiConnector_1.UnifiConnector(settings, context);
    let bot = makeBot(connector);
    server.post("/api/messages", connector.listen());
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
    // TODO: Add code to validate these fields
    const luisAppId = process.env.LuisAppId;
    const luisAPIKey = process.env.LuisAPIKey;
    const luisAPIHostName = process.env.LuisAPIHostName || 'api.projectoxford.ai';
    const luisModelUrl = `https://${luisAPIHostName}/luis/v1/application?id=${luisAppId}&subscription-key=${luisAPIKey}`;
    const filterIntent = new builder.IntentDialog()
        .matches(/.*/, [
        (session) => {
            const botAdr = session.message.address.bot;
            const botName = botAdr.name || botAdr.id || 'unifibot';
            const filter = new RegExp(`^@${botName} (.*)`);
            const matches = session.message.text.match(filter);
            if (matches) {
                session.message.text = matches[1];
                session.replaceDialog('/basic');
            }
        },
    ]);
    const intents = new builder.IntentDialog()
        .matches(/^help/i, [
        (session) => {
            session.send("Hello! I'm the UNIFI Bot. Right now my functions are:\n\n"
                + '1. Sending text messages (SMS) to groups of users. e.g.: '
                + 'Text members at 3PM "UNIFI Forum tonight at 6 behind Chat\'s"!');
        },
        (session, results) => {
            session.send('Ok... %s', results.response);
        },
    ])
        .matches(/^debug address$/i, [
        (session) => {
            session.send(stringify(session.message.address));
        },
    ])
        .matches(/^echo (.*)/, (session, args) => {
        session.send(args.matched[1]);
    })
        .matches(/.*/, (session) => {
        session.replaceDialog('/luis');
    });
    const recognizer = new builder.LuisRecognizer(luisModelUrl);
    const luis = new builder.IntentDialog({ recognizers: [recognizer] })
        .matches('TextGroup', Intents.TextGroup)
        .matches('None', (session) => {
        session.send("I'm afraid I didn't understand your message, which was \"%s\"", session.message.text);
        session.endDialog();
    })
        .onDefault((session) => {
        session.send('Sorry, I did not understand \'%s\'.', session.message.text);
        session.endDialog();
    });
    bot.dialog('/', filterIntent);
    bot.dialog('/basic', intents);
    bot.dialog('/luis', luis);
    return bot;
}
//# sourceMappingURL=index.js.map