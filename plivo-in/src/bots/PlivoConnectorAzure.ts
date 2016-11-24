import { PlivoConnector} from './PlivoConnector';

export class PlivoConnectorAzure extends PlivoConnector {
  constructor(settings) {
    super(settings);
  }

  public listen() {
    var _listen = super.listen;
    return function (context, req) {
        var response: any = {};
        _listen(context.log)(req, <any>{
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