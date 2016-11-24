import { PlivoConnector} from './PlivoConnector';
import * as qs from 'qs';


export class PlivoConnectorAzure extends PlivoConnector {
  constructor(settings) {
    super(settings);
  }

  public listen() {
    var _context = { log: (_) => {} };
    var _listen = super.listen(_context);
    return function (context, req) {
        _context.log = context.log;

        req.body = qs.parse(req.body);

        var response: any = {};
        _listen(req, <any>{
            send: function (status, body) {
                if (context) {
                    response.status = status;
                    if (body) {
                        response.body = body;
                    }
                    context.res = response;
                    context.done();
                    context = null;
                }
            },
            status: function (val) {
                if (typeof val === 'number') {
                    response.status = val;
                }
                return response.status || 200;
            },
            end: function () {
                if (context) {
                    context.res = response;
                    context.done();
                    context = null;
                }
            }
        });
    };
  }
}