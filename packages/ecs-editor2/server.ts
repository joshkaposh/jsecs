import type { BunRequest } from 'bun';
import app from './index.html';
import { getClassStructuresStatic, normalizePath, popPath } from '@repo/macros';

const PORT = process.env.PORT ?? 3000;

console.log('Server cwd: ', process.cwd());


const PROJECT_DIR = "C:\\Users\\rdjos\\OneDrive\\Documents\\dev\\projects\\libs\\jsecs\\packages\\ecs-editor2"

Bun.serve({
    port: PORT,
    routes: {
        '/': app,
        '/structs': {
            POST: async (req: BunRequest<'/structs'>) => {
                try {
                    const body = await req.json();
                    console.log(body);
                    const structs = await getClassStructuresStatic(PROJECT_DIR, body);
                    return Response.json(structs);

                } catch (error) {
                    console.error(error)
                    return Response.error();
                }
            }
        }
    },
    development: {
        hmr: true,
        chromeDevToolsAutomaticWorkspaceFolders: true,
        console: true,
    },

});

console.log(`Bun http server listening at http://localhost:${PORT}`);
