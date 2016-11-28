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

function promisify(fn: (cb) => any) {
  return new Promise((resolve, cancel) => {
    fn((err, ... args) => {
      if (!err) { resolve.apply(this, args); } else { cancel(err); }
    });
  });
};

export class Database {
  constructor(
    private spreadsheetKey: string = process.env.SpreadsheetKey,
    private serviceAccountKey: IServiceAccountKey = JSON.parse(process.env.GoogleServiceAccountKey)) {
  }

  public async scheduleMessage(target: string, date: string, message: string) {
    let doc = new GoogleSpreadsheet(this.spreadsheetKey);
    let key = this.serviceAccountKey;

    await promisify((cb) => doc.useServiceAccountAuth(key, cb));

    let sheet = await this.getOrCreateSheetAsync(doc, SMS_QUEUE_TABLE, SMS_QUEUE_HEADERS);

    let result = await promisify((cb) => sheet.addRow({ target, date, message }, cb));

    return result;
  }

  private async getOrCreateSheetAsync(doc, title: string, headers?: string[]) {
    let info = <any> await promisify((cb) => doc.getInfo(cb));

    let sheet = _.find(info.worksheets, (x: any) => x.title === title);

    if (!sheet) {
      sheet = await promisify((cb) => doc.addWorksheet({title, headers}, cb));
    }

    return sheet;
  }
}
