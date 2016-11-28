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
var CONSTANTS;
(function (CONSTANTS) {
    CONSTANTS.SMS_LIST_TABLE_PREFIX = 'sms:list:';
    CONSTANTS.SMS_QUEUE_TABLE = 'sms:queue';
    CONSTANTS.SMS_QUEUE_HEADERS = ['target', 'date', 'message', 'sent'];
})(CONSTANTS = exports.CONSTANTS || (exports.CONSTANTS = {}));
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
            yield this.promisify0((cb) => doc.useServiceAccountAuth(key, cb));
            let sheet = yield this.getOrCreateSheetAsync(doc, CONSTANTS.SMS_QUEUE_TABLE, CONSTANTS.SMS_QUEUE_HEADERS);
            this.context.log('Loaded sheet', sheet);
            let row = { target, date, message, sent: false };
            let result = yield this.promisify1((cb) => sheet.addRow(row, cb));
            this.context.log('Added row ', row, ' with result ', result);
            return result;
        });
    }
    getSmsQueueStream() {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = new GoogleSpreadsheet(this.spreadsheetKey);
            let key = this.serviceAccountKey;
            yield this.promisify0((cb) => doc.useServiceAccountAuth(key, cb));
            let info = yield this.promisify1((cb) => doc.getInfo(cb));
            let sheet = _.find(info.worksheets, (x) => x.title === CONSTANTS.SMS_QUEUE_TABLE);
            return this.getRowStream(sheet);
        });
    }
    ;
    getRowStreamByTitle(title) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = new GoogleSpreadsheet(this.spreadsheetKey);
            let key = this.serviceAccountKey;
            yield this.promisify0((cb) => doc.useServiceAccountAuth(key, cb));
            let info = yield this.promisify1((cb) => doc.getInfo(cb));
            let sheet = _.find(info.worksheets, (x) => x.title === title);
            return this.getRowStream(sheet);
        });
    }
    getRowStream(sheet) {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.log(`Reading row stream`);
            let offset = 0;
            let limit = 500;
            let orderby = "date";
            this.context.log('Loaded sheet ', sheet.title);
            let getRows = () => __awaiter(this, void 0, void 0, function* () {
                let rows = yield this.promisify1((cb) => sheet.getRows({ offset, limit, orderby }, cb));
                offset += limit;
                return {
                    rows,
                    more: rows.length > 0 ? getRows : null,
                };
            });
            return getRows();
        });
    }
    getOrCreateSheetAsync(doc, title, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            let info = yield this.promisify1((cb) => doc.getInfo(cb));
            let sheet = _.find(info.worksheets, (x) => x.title === title);
            if (!sheet) {
                sheet = yield this.promisify1((cb) => doc.addWorksheet({ title, headers }, cb));
            }
            return sheet;
        });
    }
    promisify0(fn) {
        let context = this.context;
        return new Promise((resolve, cancel) => {
            fn((err, ...args) => {
                if (!err) {
                    resolve.apply(this, args);
                }
                else {
                    cancel(err);
                }
                return;
            });
        });
    }
    ;
    promisify1(fn) {
        let context = this.context;
        return new Promise((resolve, cancel) => {
            fn((err, ...args) => {
                if (!err) {
                    resolve.apply(this, args);
                }
                else {
                    cancel(err);
                }
                return;
            });
        });
    }
    ;
    promisify2(fn) {
        let context = this.context;
        return new Promise((resolve, cancel) => {
            fn((err, ...args) => {
                if (!err) {
                    resolve(args);
                }
                else {
                    cancel(err);
                }
                return;
            });
        });
    }
    ;
}
exports.Database = Database;
//# sourceMappingURL=index.js.map