
export async function transpile() {
    const transpiler = new Bun.Transpiler({
        loader: 'ts',
        trimUnusedImports: true,
        inline: true,
    });

    const glob = new Bun.Glob('**/*.ts');

    for await (const file of glob.scan('.')) {
        console.log('file: ', file);
        const text = await Bun.file(file).text();
        console.log(transpiler.scanImports(text));
    }


}