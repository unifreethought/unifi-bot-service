import * as Intents from './intents';

import * as builder from 'botbuilder';
import * as botbuilderAzure from 'botbuilder-azure';

import stringify from 'json-stringify-safe';
import * as restify from 'restify';

const useEmulator = (process.env.NODE_ENV === 'development');

const connector = useEmulator ?
    new builder.ChatConnector() :
    new botbuilderAzure.BotServiceConnector(<any> {
      appId: process.env.MicrosoftAppId,
      appPassword: process.env.MicrosoftAppPassword,
      openIdMetadata: process.env.BotOpenIdMetadata,
      stateEndpoint: process.env.BotStateEndpoint,
    });

const universalBot = new builder.UniversalBot(connector);

// TODO: Add code to validate these fields
const luisAppId = process.env.LuisAppId;
const luisAPIKey = process.env.LuisAPIKey;
const luisAPIHostName = process.env.LuisAPIHostName || 'api.projectoxford.ai';

const luisModelUrl = `https://${luisAPIHostName}/luis/v1/application?id=${luisAppId}&subscription-key=${luisAPIKey}`;

const filterIntent = new builder.IntentDialog()
.matches(/.*/, [
  (session) => {
    const bot = session.message.address.bot;
    const botName = bot.name || bot.id || 'unifibot';
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
.matches(/^debug session/i, [
  (session) => {
    session.send(stringify(session));
  },
])
.matches(/.*/,
  (session) => {
    session.replaceDialog('/luis');
  }
);

const recognizer = new builder.LuisRecognizer(luisModelUrl);
const luis = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('TextGroup', Intents.TextGroup)
.matches('None', (session) => {
  session.send("I'm afraid I didn't understand your message, which was \"%s\"",
    session.message.text);
  session.endDialog();
})
.onDefault((session) => {
  session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

universalBot.dialog('/', filterIntent);
universalBot.dialog('/basic', intents);
universalBot.dialog('/luis', luis);

if (useEmulator) {
  const server = restify.createServer();
  server.listen(3978, () => {
    console.log('test bot endpont at http://localhost:3978/api/messages');
  });
  server.post('/api/messages', connector.listen());
} else {
  module.exports = { default: connector.listen() };
}

