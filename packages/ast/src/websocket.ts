import type { BunRequest, HTMLBundle, Server, ServeFunctionOptions } from "bun";
import { IS_DEV } from "@repo/macros" with {type: 'macro'};

// const TYPES = {
//     Initialize: 'initialize',
//     Query: 'query',
// } as const;

export class WebsocketServer<T = undefined> {

    #config: ServeFunctionOptions<T, {}>;
    #server?: Server;
    #hmr: boolean;

    constructor(config?: {
        port?: number | string;
        html?: HTMLBundle;
        dev?: {} | null;
        hmr?: {} | null
    }) {
        const PORT = config?.port || process.env.PORT || 6969;
        const DEV = IS_DEV();

        const cfg = {
            port: PORT,
            routes: config?.html == null ? undefined : {
                "/": config.html,
                "/structure": {
                    async POST(request: BunRequest<'/structure'>) {
                        // const b = Buffer.from(await (await request.blob()).arrayBuffer());
                        // console.log(b.);
                        // console.log(request.bo);
                        try {
                            const reader = request.body?.getReader();
                            const result = await request.body?.pipeThrough(new TextDecoderStream()).getReader().read();
                            console.log(result);

                        } catch (error) {

                        }


                        return new Response('Working!')
                    }
                }
            },
            fetch(request, server) {
                // if (server.upgrade(request)) {
                //     return;
                // }
                // return new Response('Upgrade failed', { status: 500 });
                return new Response('Hello world!');
            },
            websocket: {
                message(ws, message) {
                },
                async open(ws) {
                    console.log("Connection: ", ws.data);
                },
                close(ws, code, reason) {

                },
                drain(ws) {
                },
            }
        } as ServeFunctionOptions<T, {}>;

        // const server = Bun.serve(cfg);

        this.#config = cfg;
        this.#hmr = Boolean(config?.hmr) || !DEV;
    }

    listen() {
        this.#server = Bun.serve(this.#config);
        console.log(`Websocket server listening at ${this.#server.url}`);
    }
}


// export function WebSocketServer(config: { port?: number | string } = { port: 6969 }) {
//     const PORT = process.env.PORT || 6969;

//     Bun.serve({
//         port: PORT,
//         fetch(request, server) {
//             if (server.upgrade(request)) {
//                 return undefined as unknown as Response;
//             }
//             return new Response('Upgrade failed', { status: 500 });
//         },
//         websocket: {
//             message(ws, message) {

//             },
//             open(ws) {

//             },
//             close(ws, code, reason) {

//             },
//             drain(ws) {

//             },
//         }
//     });
// }
