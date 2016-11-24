/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a compconste walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
'use strict';
var builder = require("botbuilder");
var PlivoConnector_1 = require("./bots/PlivoConnector");
var PlivoConnectorAzure_1 = require("./bots/PlivoConnectorAzure");
// import stringify from 'json-stringify-safe';
var useEmulator = (process.env.NODE_ENV === 'development');
var settings = {
    plivoAuthId: process.env.PlivoAuthID,
    plivoAuthToken: process.env.PlivoAuthToken,
    plivoNumber: process.env.PlivoNumber,
};
var connector = useEmulator
    ? new PlivoConnector_1.PlivoConnector(settings)
    : new PlivoConnectorAzure_1.PlivoConnectorAzure(settings);
var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog()
    .matches(/^@unifibot help/i, function (session) {
    session.send("Hello! I'm the UNIFI Bot. Right now my functions are:\n\n"
        + '1. Sending text messages (SMS) to groups of users. e.g.: '
        + 'Text members at 3PM "UNIFI Forum tonight at 6 behind Chat\'s"!');
    session.endDialog();
})
    .matches(/^@unifibot echo/, function (session, args) {
    var filter = new RegExp("^@unifibot echo (.*)");
    var matches = session.message.text.match(filter);
    if (matches) {
        session.send(matches[1]);
    }
    session.endDialog();
});
bot.dialog('/', intents);
if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function () {
        console.log('test bot endpont at http://localhost:3978/api/plivo-in');
    });
    server.post('/api/plivo-in', connector.listen());
}
else {
    module.exports = { default: connector.listen() };
}
//# sourceMappingURL=index.js.map