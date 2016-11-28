"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const UnifiConnector_1 = require("./bots/UnifiConnector");
const db_1 = require("./db");
const db = require("./db");
const Intents = require("./intents");
const builder = require("botbuilder");
const stringify = require("json-stringify-safe");
const _ = require("lodash");
const moment = require("moment");
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
    let context = { log: console.log };
    let timer = {};
    let connector = new UnifiConnector_1.UnifiConnector(settings, context);
    let bot = makeBot(context, connector);
    main(context, timer);
}
else {
    module.exports = main;
}
function main(context, timer) {
    let connector = new UnifiConnector_1.UnifiConnector(settings, context);
    let bot = makeBot(context, connector);
    const database = new db_1.Database({ log: () => { return; } });
    let sendToList = (listName, message) => __awaiter(this, void 0, void 0, function* () {
        let title = db.CONSTANTS.SMS_LIST_TABLE_PREFIX + listName;
        let stream = {
            rows: [],
            more: () => database.getRowStreamByTitle(title),
        };
        while (stream.more) {
            stream = yield stream.more();
            _.each(stream.rows, (row) => {
                let msg = new builder.Message()
                    .address({
                    user: { id: row.phone },
                    bot: { id: process.env.PlivoNumber },
                    channelId: 'sms',
                })
                    .text(message);
                bot.send(msg);
            });
        }
    });
    let onDb = () => __awaiter(this, void 0, void 0, function* () {
        let stream = {
            rows: [],
            more: () => database.getRowStreamByTitle(db.CONSTANTS.SMS_QUEUE_TABLE),
        };
        while (stream.more) {
            stream = yield stream.more();
            _.each(stream.rows, (row) => {
                let date = moment.utc(row.date);
                let now = moment.utc();
                let lastWeek = moment.utc().subtract(7, 'days');
                if (date < now && !row.sent) {
                    context.log(`Would send message to ${row.target}: "${row.message}"`);
                    sendToList(row.target, row.message).then(() => {
                        context.log(`Finished sending message.`);
                        row.sent = moment.utc().toISOString();
                        row.save();
                    });
                }
                // TODO: test deletion logic
                // if (date < lastWeek) {
                //   // context.log(`Removing old message to ${row.target}: "${row.message}"`);
                //   // (<any>row).del();
                // }
            });
        }
    });
    onDb();
}
;
function makeBot(context, connector) {
    const bot = new builder.UniversalBot(connector, {
        persistConversationData: true,
    });
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
            connector.log(`In filter dialog, attempting to match filter ${filter} to ${session.message.text}`);
            const matches = session.message.text.match(filter);
            if (matches) {
                connector.log('Matching bot name, going to /basic dialog');
                session.message.text = matches[1];
                session.replaceDialog('/basic');
            }
        },
    ])
        .onDefault((session) => {
        connector.log('In filter dialog, ending dialog');
        session.endDialog();
    });
    const intents = new builder.IntentDialog()
        .matches(/^help/i, [
        (session) => {
            connector.log('In help dialog');
            session.send("Hello! I'm the UNIFI Bot. Right now my functions are:\n\n"
                + '1. Sending text messages (SMS) to groups of users. e.g.: '
                + 'Text members at 3PM "UNIFI Forum tonight at 6 behind Chat\'s"!');
            session.endDialog();
        },
    ])
        .matches(/^debug address$/i, [
        (session) => {
            connector.log('In debug address dialog');
            session.send(stringify(session.message.address));
            // session.endDialog();
        },
    ])
        .matches(/^echo (.*)/, (session, args) => {
        connector.log('In echo dialog');
        session.send(args.matched[1]);
        session.endDialog();
    })
        .matches(/.*/, (session) => {
        connector.log('Going to /luis dialog');
        session.replaceDialog('/luis');
    });
    const recognizer = new builder.LuisRecognizer(luisModelUrl);
    const luis = new builder.IntentDialog({ recognizers: [recognizer] })
        .matches('TextGroup', Intents.TextGroup(context, bot, '/luis/TextGroup'))
        .onDefault((session) => {
        connector.log('In /luis dialog, did not understand message.');
        session.send('Sorry, I did not understand \'%s\'.', session.message.text);
        session.endDialog();
    });
    bot.dialog('/', filterIntent);
    bot.dialog('/basic', intents);
    bot.dialog('/luis', luis);
    return bot;
}
//# sourceMappingURL=index.js.map