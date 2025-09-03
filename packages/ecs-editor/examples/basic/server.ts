// import { WebsocketServer } from '../../../ast/src/websocket';
import index from './index.html';

Bun.serve({
    routes: [
        index
    ],

    'tls': {
        cert: "",
        key: ''
    }
})