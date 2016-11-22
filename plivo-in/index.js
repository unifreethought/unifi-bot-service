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

builder.conn

const connector = useEmulator ?
    new builder.ChatConnector() :
    new botbuilderAzure.BotServiceConnector({
      appId: process.env.MicrosoftAppId,
      appPassword: process.env.MicrosoftAppPassword,
      stateEndpoint: process.env.BotStateEndpoint,
      openIdMetadata: process.env.BotOpenIdMetadata,
    });

const bot = new builder.UniversalBot(connector);

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
]);

bot.dialog('/', intents);

if (useEmulator) {
  const restify = require('restify');
  const server = restify.createServer();
  server.listen(3978, () => {
    console.log('test bot endpont at http://localhost:3978/api/plivo-in');
  });
  server.post('/api/plivo-in', connector.listen());
} else {
  module.exports = { default: connector.listen() };
}

