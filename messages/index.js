/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a compconste walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
'use strict';
const builder = require('botbuilder');
const botbuilderAzure = require('botbuilder-azure');

const useEmulator = (process.env.NODE_ENV === 'development');

const connector = useEmulator ?
    new builder.ChatConnector() :
    new botbuilderAzure.BotServiceConnector({
      appId: process.env.MicrosoftAppId,
      appPassword: process.env.MicrosoftAppPassword,
      stateEndpoint: process.env.BotStateEndpoint,
      openIdMetadata: process.env.BotOpenIdMetadata,
    });

const bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
const luisAppId = process.env.LuisAppId;
const luisAPIKey = process.env.LuisAPIKey;
const luisAPIHostName = process.env.LuisAPIHostName || 'api.projectoxford.ai';

const luisModelUrl = `https://${luisAPIHostName}/luis/v1/application?id=${luisAppId}&subscription-key=${luisAPIKey}`;

const intents = new builder.IntentDialog()
.matches(/^@unifibot help/i, [
  (session) => {
    session.send("Hello! I'm the UNIFI Bot. Right now my functions are:\n\n"
      + '1. Sending text messages (SMS) to groups of users. e.g.: '
      + 'Text members at 3PM "UNIFI Forum tonight at 6 behind Chat\'s"!');
  },
  (session, results) => {
    session.send("Ok... %s", results.response);
  },
])
.matches(/^@unifibot (.*)$/i, 
  (session, args) => {
    session.message.text = args.matched[1];
    const newSession = session.replaceDialog('/luis');
  }
);

const recognizer = new builder.LuisRecognizer(luisModelUrl);
const luis = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.matches('None', (session) => {
  session.send("I'm afraid I didn't understand your message, which was \"%s\"",
    session.message.text);
  session.endDialog();
})
.matches('TextGroup', require('./intents/TextGroup'))
.onDefault((session) => {
  session.send('Sorry, I did not understand \'%s\'. Process version: %s',
    session.message.text,
    process.version);
});


bot.dialog('/', intents);
bot.dialog('/luis', luis);

if (useEmulator) {
  const restify = require('restify');
  const server = restify.createServer();
  server.listen(3978, () => {
    console.log('test bot endpont at http://localhost:3978/api/messages');
  });
  server.post('/api/messages', connector.listen());
} else {
  module.exports = { default: connector.listen() };
}

