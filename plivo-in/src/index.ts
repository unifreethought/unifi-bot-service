/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a compconste walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
'use strict';
import * as builder from 'botbuilder';
import { PlivoConnector } from './bots/PlivoConnector';
import { PlivoConnectorAzure } from './bots/PlivoConnectorAzure';
// import stringify from 'json-stringify-safe';

const useEmulator = (process.env.NODE_ENV === 'development');

const settings = {
  plivoAuthId: process.env.PlivoAuthID,
  plivoAuthToken: process.env.PlivoAuthToken,
  plivoNumber: process.env.PlivoNumber,
};

const connector = useEmulator
  ? new PlivoConnector(settings)
  : new PlivoConnectorAzure(settings);

const bot = new builder.UniversalBot(connector);

const intents = new builder.IntentDialog()
.matches(/^@unifibot help/i, [
  (session) => {
    session.send("Hello! I'm the UNIFI Bot. Right now my functions are:\n\n"
      + '1. Sending text messages (SMS) to groups of users. e.g.: '
      + 'Text members at 3PM "UNIFI Forum tonight at 6 behind Chat\'s"!');
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