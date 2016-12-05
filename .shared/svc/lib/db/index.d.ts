import { IContext } from '../interfaces';
export interface IServiceAccountKey {
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
    getInfo(cb: (err: any, info: IInfo) => void): any;
    useServiceAccountAuth(key: IServiceAccountKey, cb: (err: any) => void): any;
}
export interface IInfo {
    worksheets: IWorksheet<any>[];
}
export interface IWorksheet<T> {
    title: string;
    getRows(options: any, cb: (err: any, rows: T[]) => void): any;
}
export interface IRow {
    save(): any;
}
export interface ISmsQueueItem extends IRow {
    target: string;
    date: string;
    message: string;
    sent: string;
}
export interface ISmsListItem extends IRow {
    fullname: string;
    name: string;
    phone: string;
}
export interface IRowStream<T> {
    rows: T[];
    more?: () => Promise<IRowStream<T>>;
}
export declare module CONSTANTS {
    const SMS_LIST_TABLE_PREFIX: string;
    const SMS_QUEUE_TABLE: string;
    const SMS_QUEUE_HEADERS: string[];
}
export declare class Database {
    private context;
    private spreadsheetKey;
    private serviceAccountKey;
    constructor(context: IContext, spreadsheetKey?: string, serviceAccountKey?: IServiceAccountKey);
    scheduleMessage(target: string, date: string, message: string): Promise<{}>;
    getSmsQueueStream(): Promise<IRowStream<ISmsQueueItem>>;
    getRowStreamByTitle<T>(title: string): Promise<IRowStream<T>>;
    private getRowStream<T>(sheet);
    private getOrCreateSheetAsync(doc, title, headers?);
    private promisify0(fn);
    private promisify1<T>(fn);
    private promisify2<T, U>(fn);
}
