import * as builder from 'botbuilder';

import * as chrono from 'chrono-node';
import * as moment from 'moment';

export const intents = [(session, args, next) => {
  // Resolve and store any entities passed from LUIS.
  const target = builder.EntityRecognizer.findEntity(args.entities, 'TextTarget');
  const timeString = builder.EntityRecognizer.findEntity(args.entities, 'TextScheduledTime');
  let time = null;
  if (timeString) {
    time = chrono.parse(timeString.entity);
  }

  const messageEntity = builder.EntityRecognizer.findEntity(args.entities, 'TextMessage');
  let message = null;
  if (messageEntity) {
    message = session.message.text.substr(
      messageEntity.startIndex,
      1 + (messageEntity.endIndex - messageEntity.startIndex));
  }

  const textMessage = session.dialogData.textMessage = {
    message: message ? message : null,
    target: target ? target.entity : null,
    time: time ? time[0].start.date() : null,
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
    session.endDialog();
  } else {
    session.endDialog();
  }
}];
