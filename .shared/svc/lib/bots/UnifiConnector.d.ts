import { IAddress, IEvent, IMessage } from 'botbuilder';
import { ChatConnector, IChatConnectorSettings } from 'botbuilder';
export interface IContext {
    done?: any;
    res?: any;
    log(message?: any, ...optionalParams: any[]): void;
}
export declare class UnifiConnector extends ChatConnector {
    protected unifiSettings: IUnifiConnectorSettings;
    protected context: IContext;
    private handler;
    constructor(unifiSettings: IUnifiConnectorSettings, context: IContext);
    listen(): IWebMiddleware;
    send(messages: IMessage[], done: (err: Error) => void): void;
    startConversation(address: IAddress, done: (err: Error, address?: IAddress) => void): void;
    onEvent(handler: (events: IEvent[], cb?: (err: Error) => void) => void): void;
    log(message?: any, ...optionalParams: any[]): void;
    private handlePlivoRequest(req, res);
}
export declare enum ConnectionType {
    Plivo = 0,
    BotService = 1,
}
export declare function channelIdToType(channelId: string): ConnectionType;
export interface IPlivoConnectorSettings {
    plivoNumber: string;
    plivoAuthId: string;
    plivoAuthToken: string;
}
export interface IUnifiConnectorSettings {
    connectedTo: ConnectionType;
    plivoSettings?: IPlivoConnectorSettings;
    chatSettings: IChatConnectorSettings;
}
/** Express or Restify Request object. */
export interface IWebRequest {
    body: any;
    headers: {
        [name: string]: string;
    };
    on(event: string, ...args: any[]): void;
}
/** Express or Restify Response object. */
export interface IWebResponse {
    end(): this;
    send(status: number, body?: any): this;
    send(body: any): this;
    status(code: number): this;
}
/** Express or Restify Middleware Function. */
export interface IWebMiddleware {
    (req: IWebRequest, res: IWebResponse, next?: Function): void;
}
