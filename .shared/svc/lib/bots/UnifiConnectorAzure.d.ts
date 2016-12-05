import { IContext, IUnifiConnectorSettings, UnifiConnector } from './UnifiConnector';
export declare class UnifiConnectorAzure extends UnifiConnector {
    constructor(settings: IUnifiConnectorSettings, context: IContext);
    listenAzure(req: any): void;
}
