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
"use strict";
// import * as utils from '../utils';
var request = require("request");
var async = require("async");
var PlivoConnector = (function () {
    function PlivoConnector(settings) {
        this.settings = settings;
    }
    PlivoConnector.prototype.listen = function (logger) {
        var _this = this;
        if (logger === void 0) { logger = console.log; }
        return function (req, res) {
            if (req.body) {
                _this.handlePlivoRequest(req, res, logger);
            }
            else {
                var requestData = '';
                req.on('data', function (chunk) {
                    requestData += chunk;
                });
                req.on('end', function () {
                    logger("Received request with raw body: " + requestData);
                    req.body = JSON.parse(requestData);
                    _this.handlePlivoRequest(req, res, logger);
                });
            }
        };
    };
    PlivoConnector.prototype.send = function (messages, done) {
        var _this = this;
        async.eachSeries(messages, function (msg, cb) {
            try {
                var reqUrl = "https://api.plivo.com/v1/Account/" + _this.settings.plivoAuthId + "/Message/";
                var auth = {
                    user: _this.settings.plivoAuthId,
                    pass: _this.settings.plivoAuthToken,
                };
                var options = {
                    json: {
                        src: _this.settings.plivoNumber,
                        dst: msg.address.user.id,
                        text: msg.text,
                        type: 'sms',
                        log: true,
                    },
                    auth: auth,
                };
                request.post(reqUrl, options, function (err, response, body) {
                    if (!err && response.statusCode >= 400) {
                        err = new Error("Unable to send message over Plivo to " + options.json.dst);
                    }
                    cb(err);
                });
            }
            catch (e) {
                cb(e);
            }
        }, done);
    };
    PlivoConnector.prototype.startConversation = function (address, done) {
        var adr = clone(address);
        if (address && address.bot && address.bot.id && address.user && address.user.id) {
            adr.conversation = { id: address.bot.id + "-" + address.user.id };
        }
        else {
            adr.conversation = { id: 'sms' };
        }
        done(null, adr);
    };
    PlivoConnector.prototype.handlePlivoRequest = function (req, res, logger) {
        // In case future authentication code is added, add it here.
        // Plivo doesn't use JWT, so we defer authentication to the listener.
        // In the case of Azure Functions, use a Function Key / API Key.
        logger("Request body, parsed: " + JSON.stringify(req.body));
        var plivoMsg = req.body;
        var message = ({
            type: 'message',
            text: plivoMsg.Text,
            timestamp: (new Date()).toISOString(),
            sourceEvent: { id: plivoMsg.MessageUUID },
            attachments: [],
            entities: [],
            address: {
                channelId: 'sms',
                bot: { id: plivoMsg.To },
                conversation: { id: plivoMsg.From + "-" + plivoMsg.To },
                user: { id: plivoMsg.From },
            },
            source: 'sms',
        });
        this.handler([message]);
        res.status(200);
        res.end();
    };
    PlivoConnector.prototype.onEvent = function (handler) {
        this.handler = handler;
    };
    return PlivoConnector;
}());
exports.PlivoConnector = PlivoConnector;
function clone(obj) {
    var cpy = {};
    if (obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                cpy[key] = obj[key];
            }
        }
    }
    return cpy;
}
//# sourceMappingURL=PlivoConnector.js.map