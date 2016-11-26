import { ConnectionType, IContext, IUnifiConnectorSettings, UnifiConnector } from './UnifiConnector';

import * as qs from 'qs';

export class UnifiConnectorAzure extends UnifiConnector {

  constructor(settings: IUnifiConnectorSettings, context: IContext) {
    super(settings, context);
  }

  public listenAzure(req) {
    switch (this.unifiSettings.connectedTo) {
      case ConnectionType.BotService:
        break;

      case ConnectionType.Plivo:
        // Plivo sends requests querystring formatted in the body.
        _context.log('Plivo request raw body: ', req.body);
        req.body = qs.parse(req.body);
        this.context.log('Plivo request body: ', req.body);
        break;

      default:
        break;
    }

    const _context = this.context;
    const response: any = {};
    (super.listen())(req, <any> {
      send(status, body) {
        response.status = status;
        if (body) {
          response.body = body;
        }
        _context.res = response;
        _context.done();
      },

      status(val) {
        if (typeof val === 'number') {
          response.status = val;
        }
        return response.status || 200;
      },

      end() {
        _context.res = response;
        _context.done();
      },
    });
  }
}
