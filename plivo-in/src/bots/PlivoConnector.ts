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
import { IConnector, IEvent, IMessage } from "botbuilder";

import * as async from "async";
import * as request from "request";

export interface IContext {
    log(message?: any, ...optionalParams: any[]): void;
}

export class PlivoConnector implements IConnector {
    private handler: (events: IEvent[], cb?: (err: Error) => void) => void;

    constructor(private settings: IPlivoConnectorSettings) { }

    public listen(context: IContext = { log: console.log }): IWebMiddleware {
        return (req: IWebRequest, res: IWebResponse) => {
            if (req.body) {
                this.handlePlivoRequest(context, req, res);
            } else {
                let requestData = "";
                req.on("data", (chunk: string) => {
                    requestData += chunk;
                });
                req.on("end", () => {
                    req.body = JSON.parse(requestData);
                    this.handlePlivoRequest(context, req, res);
                });
            }
        };
    }

    public send(messages: IMessage[], done: (err: Error) => void): void {
        async.eachSeries(messages, (msg, cb) => {
            try {
                const reqUrl = `https://api.plivo.com/v1/Account/${this.settings.plivoAuthId}/Message/`;

                const auth: request.AuthOptions = {
                    pass: this.settings.plivoAuthToken,
                    user: this.settings.plivoAuthId,
                };

                const options: request.CoreOptions = {
                    json: {
                        dst: msg.address.user.id,
                        log: true,
                        src: this.settings.plivoNumber,
                        text: msg.text,
                        type: "sms",
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
    }

    public startConversation(address: IAddress, done: (err: Error, address?: IAddress) => void): void {
        const adr = clone(address);

        if (address && address.bot && address.bot.id && address.user && address.user.id) {
            adr.conversation = { id: `${address.bot.id}-${address.user.id}` };
        } else {
            adr.conversation = { id: "sms" };
        }

        done(null, adr);
    }

    public onEvent(handler: (events: IEvent[], cb?: (err: Error) => void) => void): void {
        this.handler = handler;
    }

    private handlePlivoRequest(context: IContext, req: IWebRequest, res: IWebResponse): void {
        // In case future authentication code is added, add it here.

        // Plivo doesn't use JWT, so we defer authentication to the listener.
        // In the case of Azure Functions, use a Function Key / API Key.

        const plivoMsg = <IPlivoMessage> req.body;

        const message: IMessage = <any> ({
            address: {
                bot: { id: plivoMsg.To },
                channelId: "sms",
                conversation: { id: `${plivoMsg.From}-${plivoMsg.To}` },
                user: { id: plivoMsg.From },
            },
            attachments: [],
            entities: [],
            source: "sms",
            sourceEvent: { id: plivoMsg.MessageUUID },
            text: plivoMsg.Text,
            timestamp: (new Date()).toISOString(),
            type: "message",
        });

        this.handler([message]);

        res.status(200);
        res.end();
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
