import { ConnectionType, IUnifiConnectorSettings, UnifiConnector } from './UnifiConnector';

import * as qs from 'qs';

export class UnifiConnectorAzure extends UnifiConnector {
  constructor(settings: IUnifiConnectorSettings) {
    super(settings);
  }

  public listen() {
    const botCtx = { log: console.log };
    const superListen = super.listen(botCtx);
    return (context, req) => {
      botCtx.log = context.log;

      context.log('Connected to: ', ConnectionType[this.unifiSettings.connectedTo]);
      switch (this.unifiSettings.connectedTo) {
        case ConnectionType.BotService:
          break;

        case ConnectionType.Plivo:
          // Plivo sends requests querystring formatted in the body.
          req.body = qs.parse(req.body);
          context.log('Plivo request coming in, body: ', req.body);
          break;

        default:
          break;
      }

      const response: any = {};
      superListen(req, <any>{
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
          if (typeof val === 'number') {
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
