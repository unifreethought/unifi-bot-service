import { PlivoConnector} from "./PlivoConnector";

import * as qs from "qs";

export class PlivoConnectorAzure extends PlivoConnector {
  constructor(settings) {
    super(settings);
  }

  public listen() {
    const botCtx = { log: console.log };
    const superListen = super.listen(botCtx);
    return (context, req) => {
        botCtx.log = context.log;

        req.body = qs.parse(req.body);

        const response: any = {};
        superListen(req, <any> {
            send(status, body) {
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

            status(val) {
                if (typeof val === "number") {
                    response.status = val;
                }
                return response.status || 200;
            },

            end() {
                if (context) {
                    context.res = response;
                    context.done();
                    context = null;
                }
            },
        });
    };
  }
}
