import { IContext } from '../interfaces';

import * as GoogleSpreadsheet from 'google-spreadsheet';
import * as _ from 'lodash';
import * as moment from 'moment';

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

export interface IDoc {
  getInfo(cb: (err: any, info: IInfo) => void);
  useServiceAccountAuth(key: IServiceAccountKey, cb: (err: any) => void);
}

export interface IInfo {
  worksheets: IWorksheet<any>[],
}

export interface IWorksheet<T> {
  title: string;
  getRows(options: any, cb: (err: any, rows: T[]) => void);
}

export interface IRow {
  save();
}

export interface ISmsQueueItem extends IRow {
  target: string;
  date: string;
  message: string;
  sent: string;
}

export interface ISmsListItem extends IRow {
  fullname: string,
  name: string,
  phone: string,
}

export interface IRowStream<T> {
  rows: T[];
  more?: () => Promise<IRowStream<T>>;
}

export module CONSTANTS {
  export const SMS_LIST_TABLE_PREFIX: string = 'sms:list:';
  export const SMS_QUEUE_TABLE: string = 'sms:queue';
  export const SMS_QUEUE_HEADERS: string[] = ['target', 'date', 'message', 'sent'];
}

export class Database {
  constructor(
    private context: IContext,
    private spreadsheetKey: string = process.env.SpreadsheetKey,
    private serviceAccountKey: IServiceAccountKey = JSON.parse(process.env.GoogleServiceAccountKey)) {
    context.log('Initializing database for spreadsheetKey: ', spreadsheetKey);
    // context.log('And service account: ', serviceAccountKey);
  }

  public async scheduleMessage(target: string, date: string, message: string) {
    let doc: IDoc = new GoogleSpreadsheet(this.spreadsheetKey);
    let key = this.serviceAccountKey;
    this.context.log(`Connecting to doc`);

    await this.promisify0((cb) => doc.useServiceAccountAuth(key, cb));

    let sheet = await this.getOrCreateSheetAsync(doc, CONSTANTS.SMS_QUEUE_TABLE, CONSTANTS.SMS_QUEUE_HEADERS);
    this.context.log('Loaded sheet', sheet);

    let row = { target, date, message, sent: false };
    let result = await this.promisify1((cb) => sheet.addRow(row, cb));
    this.context.log('Added row ', row, ' with result ', result);

    return result;
  }

  public async getSmsQueueStream(): Promise<IRowStream<ISmsQueueItem>> {
    let doc: IDoc = new GoogleSpreadsheet(this.spreadsheetKey);
    let key = this.serviceAccountKey;

    await this.promisify0((cb) => doc.useServiceAccountAuth(key, cb));

    let info = await this.promisify1<IInfo>((cb) => doc.getInfo(cb));

    let sheet: IWorksheet<ISmsQueueItem> = _.find(info.worksheets, (x: any) => x.title === CONSTANTS.SMS_QUEUE_TABLE);

    return this.getRowStream<ISmsQueueItem>(sheet);
  };

  public async getRowStreamByTitle<T>(title: string): Promise<IRowStream<T>> {
    let doc: IDoc = new GoogleSpreadsheet(this.spreadsheetKey);
    let key = this.serviceAccountKey;

    await this.promisify0((cb) => doc.useServiceAccountAuth(key, cb));

    let info = await this.promisify1<IInfo>((cb) => doc.getInfo(cb));

    let sheet: IWorksheet<T> = _.find(info.worksheets, (x: any) => x.title === title);

    return this.getRowStream<T>(sheet);
  }

  private async getRowStream<T>(sheet: IWorksheet<T>): Promise<IRowStream<T>> {
    this.context.log(`Reading row stream`);

    let offset = 0;
    let limit = 500;
    let orderby = "date";
    this.context.log('Loaded sheet ', sheet.title);

    let getRows = async (): Promise<IRowStream<T>> => {
      let rows = await this.promisify1<T[]>((cb) => sheet.getRows({offset, limit, orderby}, cb));
      offset += limit;

      return {
        rows,
        more: rows.length > 0 ? getRows : null,
      }
    };

    return getRows();
  }

  private async getOrCreateSheetAsync(doc, title: string, headers?: string[]) {
    let info = <any>await this.promisify1((cb) => doc.getInfo(cb));

    let sheet = _.find(info.worksheets, (x: any) => x.title === title);

    if (!sheet) {
      sheet = await this.promisify1((cb) => doc.addWorksheet({ title, headers }, cb));
    }

    return sheet;
  }

  private promisify0(fn: (cb: (err: any) => void) => void): Promise<any> {
    let context = this.context;
    return new Promise((resolve, cancel) => {
      fn((err, ...args) => {
        if (!err) {
          resolve.apply(this, args);
        } else {
          cancel(err);
        }
        return;
      });
    });
  };

  private promisify1<T>(fn: (cb: (err: any, res: T) => void) => void): Promise<T> {
    let context = this.context;
    return new Promise<T>((resolve, cancel) => {
      fn((err, ...args) => {
        if (!err) {
          resolve.apply(this, args);
        } else {
          cancel(err);
        }
        return;
      });
    });
  };
  
  private promisify2<T, U>(fn: (cb: (err: any, res1: T, res2: U) => void) => void): Promise<[T, U]> {
    let context = this.context;
    return new Promise((resolve, cancel) => {
      fn((err, ...args) => {
        if (!err) {   
          resolve(args);
        } else {
          cancel(err);
        }
        return;
      });
    });
  };
}
