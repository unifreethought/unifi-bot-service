import { Database } from '../db';
import { IContext } from '../interfaces';

import * as builder from 'botbuilder';

import * as chrono from 'chrono-node';
import * as moment from 'moment';

import * as db from '../db';

const guessPMRefiner = new chrono.Refiner();
guessPMRefiner.refine = (text, results, opt) => {
  // 10:30, 11, etc become AM
  // 5:00, 4:00, etc, become PM.
  results.forEach((result) => {
    if (!result.start.isCertain('meridiem') && result.start.get('hour') >= 10) {
      result.start.assign('meridiem', 0);
      result.start.assign('hour', result.start.get('hour'));
    } else if (!result.start.isCertain('meridiem') && result.start.get('hour') < 10) {
      result.start.assign('meridiem', 1);
      result.start.assign('hour', result.start.get('hour') + 12);
    }
  });
  return results;
};

const futureRefiner = new chrono.Refiner();
futureRefiner.refine = (text, results, opt) => {
  // If the day 
  results.forEach((result) => {
    // TODO: Handle cases based on user's time zone, try to make sure we handle
    // cases like 'at 3:30PM' when it is 4:00 PM'
  });
  return results;
};

const chronoParser = new chrono.Chrono();
chronoParser.refiners.push(guessPMRefiner);
chronoParser.refiners.push(futureRefiner);

export function addIntents(context: IContext, bot: builder.UniversalBot, dialogId: string): string {
  bot.dialog(dialogId, [(session, args, next) => {
    const target = builder.EntityRecognizer.findEntity(args.entities, 'TextTarget');
    const timeString = builder.EntityRecognizer.findEntity(args.entities, 'TextScheduledTime');
    let time = null;
    if (timeString) {
      time = chronoParser.parse(timeString.entity);
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
      // TODO: Adjust time parsing here.
      // const time = chronoParser.parse(results.response);
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

      const db = new Database(context);
      db.scheduleMessage(target, formattedTime, message);

      session.endDialog();
    } else {
      session.endDialog();
    }
  },
  ]);

  return dialogId;
}
