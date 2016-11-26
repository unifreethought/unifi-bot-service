import { IAddress, IConnector, IEvent, IMessage } from 'botbuilder';
import { ChatConnector, IChatConnectorSettings } from 'botbuilder';

import * as async from 'async';
import * as request from 'request';

import * as _ from 'lodash';

const PlivoChannelId: string = 'sms';

export interface IContext {
    log(message?: any, ...optionalParams: any[]): void;
}

export class UnifiConnector extends ChatConnector {
    private handler: (events: IEvent[], cb?: (err: Error) => void) => void;

    constructor(protected unifiSettings: IUnifiConnectorSettings,
                protected context: IContext) {
        super(unifiSettings.chatSettings);
    }

    public listen(): IWebMiddleware {
        switch (this.unifiSettings.connectedTo) {
            case ConnectionType.BotService:
                return super.listen();

            case ConnectionType.Plivo:
                return (req: IWebRequest, res: IWebResponse) => {
                    if (req.body) {
                        this.handlePlivoRequest(req, res);
                    } else {
                        let requestData = '';
                        req.on('data', (chunk: string) => {
                            requestData += chunk;
                        });
                        req.on('end', () => {
                            req.body = JSON.parse(requestData);
                            this.handlePlivoRequest(req, res);
                        });
                    }
                };

            default:
                throw new Error('No connection type specified.');
        }
    }

    public send(messages: IMessage[], done: (err: Error) => void): void {
        const plivoMessages = messages.filter((msg) => msg.address.channelId === PlivoChannelId);

        const grouped = _.groupBy(<_.List<IMessage>> messages, (msg) => {
            return channelIdToType(msg.address.channelId);
        });

        _.each(grouped, (value, key) => {
            console.log('key = ', key);
            console.log('value = ', value);

            // key is a string here, e.g.: "0", and we double-lookup to convert
            // from the string to the name associated with it, to the number.
            switch (<any> ConnectionType[ConnectionType[key]]) {
                case ConnectionType.BotService:
                    super.send(messages, done);
                    break;

                case ConnectionType.Plivo:
                    const plivoSettings = this.unifiSettings.plivoSettings;
                    async.eachSeries(messages, (msg, cb) => {
                        try {
                            const reqUrl = `https://api.plivo.com/v1/Account/${plivoSettings.plivoAuthId}/Message/`;

                            const auth: request.AuthOptions = {
                                pass: plivoSettings.plivoAuthToken,
                                user: plivoSettings.plivoAuthId,
                            };

                            const options: request.CoreOptions = {
                                json: {
                                    dst: msg.address.user.id,
                                    log: true,
                                    src: plivoSettings.plivoNumber,
                                    text: msg.text,
                                    type: 'sms',
                                },
                                auth,
                            };

                            request.post(reqUrl, options, (err, response, body) => {
                                if (!err && response.statusCode >= 400) {
                                    err = new Error(`Unable to send message over Plivo to ${options.json.dst}`);
                                }
                                cb(err);
                            });
                        } catch (e) {
                            cb(e);
                        }
                    }, done);
                    break;

                default:
                    done(new Error('No connection type specified.'));
            }
        });

    }

    public startConversation(address: IAddress, done: (err: Error, address?: IAddress) => void): void {
        switch (channelIdToType(address.channelId)) {
            case ConnectionType.BotService:
                super.startConversation(address, done);
                break;

            case ConnectionType.Plivo:
                const adr = clone(address);

                if (address && address.bot && address.bot.id && address.user && address.user.id) {
                    adr.conversation = { id: `${address.bot.id}-${address.user.id}` };
                } else {
                    adr.conversation = { id: 'plivo' };
                }

                done(null, adr);
                break;

            default:
                done(new Error('No connection type specified'), address);
        }
    }

    public onEvent(handler: (events: IEvent[], cb?: (err: Error) => void) => void): void {
        this.handler = handler;
    }

    private handlePlivoRequest(req: IWebRequest, res: IWebResponse): void {
        // In case future authentication code is added, add it here.

        // Plivo doesn't use JWT, so we defer authentication to the listener.
        // In the case of Azure Functions, use a Function Key / API Key.

        const plivoMsg = <IPlivoMessage> req.body;

        const message: IMessage = <any> ({
            address: {
                bot: { id: plivoMsg.To },
                channelId: PlivoChannelId,
                conversation: { id: `${plivoMsg.From}-${plivoMsg.To}` },
                user: { id: plivoMsg.From },
            },
            attachments: [],
            entities: [],
            source: 'plivo',
            sourceEvent: { id: plivoMsg.MessageUUID },
            text: plivoMsg.Text,
            timestamp: (new Date()).toISOString(),
            type: 'message',
        });

        this.handler([message]);

        res.status(200);
        res.end();
    }
}

interface IPlivoMessage {
    From: string;
    To: string;
    Type: 'sms';
    Text: string;
    MessageUUID: string;
}

export enum ConnectionType {
    Plivo,
    BotService,
}

export function channelIdToType(channelId: string): ConnectionType {
    switch (channelId) {
        case PlivoChannelId:
            return ConnectionType.Plivo;
        default:
            return ConnectionType.BotService;
    }
}

export interface IContext {
    log(message?: any, ...optionalParams: any[]): void;
}

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

function clone(obj: any): any {
    const cpy: any = {};
    if (obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cpy[key] = obj[key];
            }
        }
    }
    return cpy;
}
