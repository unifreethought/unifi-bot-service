"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const GoogleSpreadsheet = require("google-spreadsheet");
const _ = require("lodash");
const SMS_QUEUE_TABLE = 'sms:queue';
const SMS_QUEUE_HEADERS = ['target', 'date', 'message'];
class Database {
    constructor(context, spreadsheetKey = process.env.SpreadsheetKey, serviceAccountKey = JSON.parse(process.env.GoogleServiceAccountKey)) {
        this.context = context;
        this.spreadsheetKey = spreadsheetKey;
        this.serviceAccountKey = serviceAccountKey;
        context.log('Initializing database for spreadsheetKey: ', spreadsheetKey);
        // context.log('And service account: ', serviceAccountKey);
    }
    scheduleMessage(target, date, message) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = new GoogleSpreadsheet(this.spreadsheetKey);
            let key = this.serviceAccountKey;
            this.context.log(`Connecting to doc`);
            yield this.promisify((cb) => doc.useServiceAccountAuth(key, cb));
            let sheet = yield this.getOrCreateSheetAsync(doc, SMS_QUEUE_TABLE, SMS_QUEUE_HEADERS);
            this.context.log('Loaded sheet', sheet);
            let row = { target, date, message };
            let result = yield this.promisify((cb) => sheet.addRow(row, cb));
            this.context.log('Added row ', row, ' with result ', result);
            return result;
        });
    }
    getOrCreateSheetAsync(doc, title, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            let info = yield this.promisify((cb) => doc.getInfo(cb));
            let sheet = _.find(info.worksheets, (x) => x.title === title);
            if (!sheet) {
                sheet = yield this.promisify((cb) => doc.addWorksheet({ title, headers }, cb));
            }
            return sheet;
        });
    }
    promisify(fn) {
        let context = this.context;
        return new Promise((resolve, cancel) => {
            fn((err, ...args) => {
                if (!err) {
                    resolve.apply(this, args);
                }
                else {
                    console.log('Encountered error in async action: ', err);
                    cancel(err);
                }
            });
        });
    }
    ;
}
exports.Database = Database;
//# sourceMappingURL=index.js.map