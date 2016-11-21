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
const moment = require('moment');

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

// Main dialog with LUIS
const recognizer = new builder.LuisRecognizer(luisModelUrl);
const intents = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.matches('TextGroup',
    [(session, args, next) => {
        // Resolve and store any entities passed from LUIS.
      const target = builder.EntityRecognizer.findEntity(args.entities, 'TextTarget');
      const timeString = builder.EntityRecognizer.findEntity(args.entities, 'TextScheduledTime');
      let time = null;
      if (timeString) {
        time = builder.EntityRecognizer.recognizeTime(timeString.entity);
        time = builder.EntityRecognizer.parseTime(timeString.entity);
      }

      const messageEntity = builder.EntityRecognizer.findEntity(args.entities, 'TextMessage');
      let message = null;
      if (messageEntity) {
        message = session.message.text.substr(
          messageEntity.startIndex,
          messageEntity.endIndex - messageEntity.startIndex);
      }

      const textMessage = session.dialogData.textMessage = {
        target: target ? target.entity : null,
        time: time ? time.resolution.ref : null,
        message: message ? message : null,
      };

      // Prompt for target
      if (!textMessage.target) {
        builder.Prompts.text(session, 'Who would you like to message?');
      } else {
        next();
      }
    },
    (session, results, next) => {
      const textMessage = session.dialogData.textMessage;
      if (results.response) {
        textMessage.target = results.response;
      }

      if (textMessage.target && !textMessage.time) {
        builder.Prompts.time(session, 'What time would you like to send the message?');
      } else {
        next();
      }
    },
    (session, results, next) => {
      const textMessage = session.dialogData.textMessage;
      if (results.response) {
        const time = builder.EntityRecognizer.resolveTime([results.response]);
        textMessage.time = time;
      }

      // Prompt for message (title will be blank if the user said cancel)
      if (textMessage.target && textMessage.time && !textMessage.message) {
        builder.Prompts.text(session, 'What would you like to send in the message?');
      } else {
        next();
      }
    },
    (session, results) => {
      const textMessage = session.dialogData.textMessage;
      if (results.response) {
        textMessage.message = results.response;
      }

      if (textMessage.target && textMessage.time && textMessage.message) {
        const formattedTime = moment(textMessage.time).calendar();
        const target = textMessage.target;
        const message = textMessage.message;

        session.send(`Okay! ${formattedTime} we will send ${target} "${message}"`);
      } else {
        session.send('Ok... no problem.');
      }
    }]
)
.onDefault((session) => {
  session.send('Sorry, I did not understand \'%s\'. Process version: %s',
    session.message.text,
    process.version);
});

bot.dialog('/', intents);

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

