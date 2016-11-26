import { IUniversalBotSettings } from './bots/botbuilder';
import { ConnectionType, IUnifiConnectorSettings, UnifiConnector } from './bots/UnifiConnector';
import { UnifiConnectorAzure } from './bots/UnifiConnectorAzure';

import * as builder from "botbuilder";
import * as restify from "restify";
// import stringify from "json-stringify-safe";

const useEmulator = (process.env.NODE_ENV === "development");

const settings: IUnifiConnectorSettings = {
  chatSettings: <any> {
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

const connector = useEmulator
  ? new UnifiConnector(settings)
  : new UnifiConnectorAzure(settings);

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
    .text(session.message.text);
  bot.send(message);
});

bot.on('trigger')

bot.dialog("/", intents);

if (useEmulator) {
  const server = restify.createServer();
  server.listen(3978, () => {
    console.log("test bot endpont at http://localhost:3978/api/plivo-in");
  });

  server.post("/api/plivo-in", connector.listen());
} else {
  module.exports = { default: connector.listen() };
}

/*
POST https://unifi-bot-service.azurewebsites.net/api/plivo-in?code=3uy26msc0ipafhy67c1xqyxz0loz7kdn9xx41

To=13192149770&From=13196106722&Text=%40unifibot%20help&Type=sms&MessageUUID=38a67f51-b1f3-11e6-8c60-02daa5941325

*/
