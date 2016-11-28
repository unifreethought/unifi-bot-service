import { IContext } from '../interfaces';

import * as GoogleSpreadsheet from 'google-spreadsheet';
import * as _ from 'lodash';

interface IServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface ISmsQueueItem {
  target: string;
  date: string;
  message: string;
}

const SMS_QUEUE_TABLE: string = 'sms:queue';
const SMS_QUEUE_HEADERS: string[] = ['target', 'date', 'message'];

export class Database {
  constructor(
    private context: IContext,
    private spreadsheetKey: string = process.env.SpreadsheetKey,
    private serviceAccountKey: IServiceAccountKey = JSON.parse(process.env.GoogleServiceAccountKey)) {
    context.log('Initializing database for spreadsheetKey: ', spreadsheetKey);
    // context.log('And service account: ', serviceAccountKey);
  }

  public async scheduleMessage(target: string, date: string, message: string) {
    let doc = new GoogleSpreadsheet(this.spreadsheetKey);
    let key = this.serviceAccountKey;
    this.context.log(`Connecting to doc`);

    await this.promisify((cb) => doc.useServiceAccountAuth(key, cb));

    let sheet = await this.getOrCreateSheetAsync(doc, SMS_QUEUE_TABLE, SMS_QUEUE_HEADERS);
    this.context.log('Loaded sheet', sheet);

    let row = { target, date, message };
    let result = await this.promisify((cb) => sheet.addRow(row, cb));
    this.context.log('Added row ', row, ' with result ', result);

    return result;
  }

  private async getOrCreateSheetAsync(doc, title: string, headers?: string[]) {
    let info = <any>await this.promisify((cb) => doc.getInfo(cb));

    let sheet = _.find(info.worksheets, (x: any) => x.title === title);

    if (!sheet) {
      sheet = await this.promisify((cb) => doc.addWorksheet({ title, headers }, cb));
    }

    return sheet;
  }

  private promisify(fn: (cb) => any) {
    let context = this.context;
    return new Promise((resolve, cancel) => {
      fn((err, ...args) => {
        if (!err) {
          resolve.apply(this, args);
        } else {
          console.log('Encountered error in async action: ', err);
          cancel(err);
        }
      });
    });
  };
}
