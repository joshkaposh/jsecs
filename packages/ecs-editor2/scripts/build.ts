import { SolidPlugin } from 'bun-plugin-solid';

Bun.serve({
    port: 3000,
    routes: './index.html'
});

await Bun.build({
    entrypoints: ['./index.html'],
    outdir: './dist',
    plugins: [SolidPlugin()]
})