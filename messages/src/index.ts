import { ConnectionType, UnifiConnector } from './bots/UnifiConnector';
import { UnifiConnectorAzure } from './bots/UnifiConnectorAzure';
import { IContext } from './interfaces';

import * as db from './db';
import * as Intents from './intents';

import * as builder from 'botbuilder';
import * as botbuilderAzure from 'botbuilder-azure';

import * as stringify from 'json-stringify-safe';
import * as restify from 'restify';

import * as _ from 'lodash';

const useEmulator = (process.env.NODE_ENV === 'development');

const settings = {
  chatSettings: <any> {
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata,
    stateEndpoint: process.env.BotStateEndpoint,
  },
  connectedTo: ConnectionType.BotService,
  plivoSettings: {
    plivoAuthId: process.env.PlivoAuthID,
    plivoAuthToken: process.env.PlivoAuthToken,
    plivoNumber: process.env.PlivoNumber,
  },
};

if (useEmulator) {
  const server = restify.createServer();
  server.listen(3978, () => {
    console.log('test bot endpont at http://localhost:3978/api/messages');
  });

  let context = { log: console.log };
  let connector = new UnifiConnector(settings, context);
  let bot = makeBot(context, connector);

  server.post('/api/messages', <any> connector.listen());
} else {
  module.exports = (context, req) => {
    let connector = new UnifiConnectorAzure(settings, context);
    let bot = makeBot(context, connector);

    connector.listenAzure(req);
  };
}

function makeBot(context: IContext, connector: UnifiConnector): builder.UniversalBot {
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
