import { TraitMeta } from "./trait-meta";

const meta = new TraitMeta(process.cwd());

export function GetTraitMetadata(trait_name: string) {
    return meta.get(trait_name)!;
}

export async function GetTraitDefinitions() {
    const root = meta.cwd;

    let start = performance.now();
    const trait_files = await meta.findTraitFiles();
    console.log('trait file resolution time: ', (performance.now() - start) / 1000)
    start = performance.now();

    await meta.parseFiles(trait_files);

    console.log('extract metadata', (performance.now() - start) / 1000);

    start = performance.now();
    const json = meta.traitFiles();

    await Bun.file(`${root}/.trait-metadata.json`).write(json);
    console.log('trait-metadata.json write time: ', (performance.now() - start) / 1000);
    return json;
}

/**
 * **This method must be called inside a trait function body**
 * 
 * @returns an array of the expected trait keys
 */
export function GetTraitKeys(trait_name: string): string[] {
    return meta.get(trait_name)!.methods.names;
}
