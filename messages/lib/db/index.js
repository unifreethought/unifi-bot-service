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
function promisify(fn) {
    return new Promise((resolve, cancel) => {
        fn((err, ...args) => {
            if (!err) {
                resolve.apply(this, args);
            }
            else {
                cancel(err);
            }
        });
    });
}
;
class Database {
    constructor(spreadsheetKey = process.env.SpreadsheetKey, serviceAccountKey = JSON.parse(process.env.GoogleServiceAccountKey)) {
        this.spreadsheetKey = spreadsheetKey;
        this.serviceAccountKey = serviceAccountKey;
    }
    scheduleMessage(target, date, message) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = new GoogleSpreadsheet(this.spreadsheetKey);
            let key = this.serviceAccountKey;
            yield promisify((cb) => doc.useServiceAccountAuth(key, cb));
            let sheet = yield this.getOrCreateSheetAsync(doc, SMS_QUEUE_TABLE, SMS_QUEUE_HEADERS);
            let result = yield promisify((cb) => sheet.addRow({ target, date, message }, cb));
            return result;
        });
    }
    getOrCreateSheetAsync(doc, title, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            let info = yield promisify((cb) => doc.getInfo(cb));
            let sheet = _.find(info.worksheets, (x) => x.title === title);
            if (!sheet) {
                sheet = yield promisify((cb) => doc.addWorksheet({ title, headers }, cb));
            }
            return sheet;
        });
    }
}
exports.Database = Database;
//# sourceMappingURL=index.js.map