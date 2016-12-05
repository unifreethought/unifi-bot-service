import { ConnectionType, IUnifiConnectorSettings, UnifiConnector } from '../bots/UnifiConnector';
import { UnifiConnectorAzure } from '../bots/UnifiConnectorAzure';

import { IConnector, UniversalBot } from 'botbuilder';

import * as builder from "botbuilder";
import * as restify from "restify";

declare var process: any;

const useEmulator = (process.env.NODE_ENV === "development");

const settings: IUnifiConnectorSettings = {
  chatSettings: <any>{
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata,
    stateEndpoint: process.env.BotStateEndpoint,
  },
  connectedTo: ConnectionType.Plivo,
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
  let connector = new UnifiConnector(settings, context);
  let bot = makeBot(connector);

  server.post("/api/plivo-in", <any> connector.listen());
}

export default (context, req) => {
    let connector = new UnifiConnectorAzure(settings, context);
    let bot = makeBot(connector);

    connector.listenAzure(req);
};

function makeBot(connector: IConnector): UniversalBot {
  const bot = new UniversalBot(connector);

  const intents = new builder.IntentDialog()
    .onDefault((session) => {
      const message = new builder.Message()
        .address(JSON.parse(process.env.SlackAddress))
        .text(`Text from ${session.message.address.user.id}: ${session.message.text}`)
      bot.send(message);
    });

  bot.dialog("/", intents);

  return bot;
}
