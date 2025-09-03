import { Traits } from "./trait-meta";

const meta = new Traits(process.cwd());

export function GetTraitMetadata(trait_name: string) {
    return meta.get(trait_name)!;
}

async function generateTraitDefinitions(root: string) {

    let start = performance.now();
    const trait_files = await meta.findTraitFiles(root);
    console.log('trait file resolution time: ', (performance.now() - start) / 1000)

    start = performance.now();
    await meta.parseFiles(trait_files);
    console.log('extract metadata', (performance.now() - start) / 1000);

    start = performance.now();
    const json = meta.serialize(2);

    await Bun.file(`${root}/.trait-metadata.json`).write(json);
    console.log('trait-metadata.json write time: ', (performance.now() - start) / 1000);
    return json;
}

async function generateTraitImplementors(root: string) {

    let start = performance.now();
    const implementation_files = await meta.findTraitImplementations(root);
    console.log('implementor file(s) resolution time: ', (performance.now() - start) / 1000)
    // start = performance.now();
    // await meta.parseFiles(trait_files);

    console.log('extract metadata', (performance.now() - start) / 1000);

}

export async function GenerateTraitMetadata() {
    const root = meta.cwd;
    await generateTraitDefinitions(root);
    await generateTraitImplementors(root);
}

/**
 * **This method must be called inside a trait function body**
 * 
 * @returns an array of the expected trait keys
 */
export function GetTraitKeys(trait_name: string): string[] {
    return meta.get(trait_name)!.names;
}
