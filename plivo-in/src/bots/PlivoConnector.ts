//
// Copyright (c) Aaron Friel. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Builder SDK Github:
// https://github.com/Microsoft/BotBuilder
//
// Copyright (c) Aaron Friel
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { IConnector, IEvent, IMessage } from 'botbuilder';
// import * as utils from '../utils';
import * as request from 'request';
import * as async from 'async';

export interface IConnectorLogger {
    (message: string): void;
}

export class PlivoConnector implements IConnector {
    private handler: (events: IEvent[], cb?: (err: Error) => void) => void;

    constructor(private settings: IPlivoConnectorSettings) { }

    public listen(logger: IConnectorLogger = console.log): IWebMiddleware {
        return (req: IWebRequest, res: IWebResponse) => {
            if (req.body) {
                this.handlePlivoRequest(req, res, logger);
            } else {
                var requestData = '';
                req.on('data', (chunk: string) => {
                    requestData += chunk;
                });
                req.on('end', () => {
                    logger(`Received request with raw body: ${requestData}`);
                    req.body = JSON.parse(requestData);
                    this.handlePlivoRequest(req, res, logger);
                });
            }
        };
    }

    public send(messages: IMessage[], done: (err: Error) => void): void {
        async.eachSeries(messages, (msg, cb) => {
            try {
                var reqUrl = `https://api.plivo.com/v1/Account/${this.settings.plivoAuthId}/Message/`;

                var auth: request.AuthOptions = {
                    user: this.settings.plivoAuthId,
                    pass: this.settings.plivoAuthToken,
                };

                var options: request.CoreOptions = {
                    json: {
                        src: this.settings.plivoNumber,
                        dst: msg.address.user.id,
                        text: msg.text,
                        type: 'sms',
                        log: true,
                    },
                    auth: auth,
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
    }

    public startConversation(address: IAddress, done: (err: Error, address?: IAddress) => void): void {
        var adr = clone(address);

        if (address && address.bot && address.bot.id && address.user && address.user.id) {
            adr.conversation = { id: `${address.bot.id}-${address.user.id}` };
        } else {
            adr.conversation = { id: 'sms' }
        }

        done(null, adr);
    }

    private handlePlivoRequest(req: IWebRequest, res: IWebResponse, logger: IConnectorLogger): void {
        // In case future authentication code is added, add it here.

        // Plivo doesn't use JWT, so we defer authentication to the listener.
        // In the case of Azure Functions, use a Function Key / API Key.

        logger(`Request body, parsed: ${JSON.stringify(req.body)}`);

        var plivoMsg = <IPlivoMessage>req.body;

        var message: IMessage = <any>({
            type: 'message',
            text: plivoMsg.Text,
            timestamp: (new Date()).toISOString(),
            sourceEvent: { id: plivoMsg.MessageUUID },
            attachments: [],
            entities: [],
            address: {
                channelId: 'sms',
                bot: { id: plivoMsg.To },
                conversation: { id: `${plivoMsg.From}-${plivoMsg.To}` },
                user: { id: plivoMsg.From },
            },
            source: 'sms',
        });

        this.handler([message]);

        res.status(200);
        res.end();
    }

    public onEvent(handler: (events: IEvent[], cb?: (err: Error) => void) => void): void {
        this.handler = handler;
    }
}

interface IPlivoMessage {
    From: string;
    To: string;
    Type: "sms";
    Text: string;
    MessageUUID: string;
}

export interface IPlivoConnectorSettings {
    plivoNumber: string;
    plivoAuthId: string;
    plivoAuthToken: string;
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
    var cpy: any = {};
    if (obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                cpy[key] = obj[key];
            }
        }
    }
    return cpy;
}