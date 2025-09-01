import { Glob } from "bun";
import { type Node, Project, SourceFile, Structure, SyntaxKind, type ImportSpecifierStructure, type InterfaceDeclarationStructure, type OptionalKind } from 'ts-morph';
import { normalize } from 'node:path';
import { bit } from 'joshkaposh-option'
import { Flags, TraitMeta, type MethodMetadata, type TraitMetadata, type TraitsMetadata } from "./trait-meta";

const meta = new TraitMeta(process.cwd());

function parseTraitFile(
    aliases: InterfaceDeclarationStructure[],
    traits: Record<string, TraitMetadata>,
    trait_names: string[]
) {
    for (let i = 0; i < aliases.length; i++) {
        const alias = aliases[i]!;
        const methods = alias.methods ?? [];
        const trait_methods: MethodMetadata = {
            names: [],
            all: {},
            static: {},
            instance: {},
            provided: {},
            required: {}
        };

        const trait_meta: TraitMetadata = {
            name: alias.name,
            implementations: Object.create(null),
            methods: trait_methods
        };

        const { all, names, static: statics, instance, required, provided } = trait_methods;

        for (let i = 0; i < methods.length; i++) {

            const m = methods[i]!;
            const isStatic = m.parameters?.[0]?.name !== 'this';
            const isProvided = m.hasQuestionToken ?? false;
            const name = m.name;

            let flags = Flags.flags;

            flags = bit.set(flags, isStatic ? Flags.static : Flags.instance);
            flags = bit.set(flags, isProvided ? Flags.provided : Flags.required);

            names.push(name);
            all[name] = flags;

            if (isStatic) {
                statics[name] = '';
            } else {
                instance[name] = '';
            }

            if (isProvided) {
                provided[name] = ''
            } else {
                statics[name] = ''
            }

            // isStatic ?
            //     statics.push(name) :
            //     instance.push(name);

        }


        trait_names.push(trait_meta.name);
        traits[trait_meta.name] = trait_meta;
    }
}

function findTraitFilesFast(file_extentions?: string, rootDir?: string) {
    return new Glob(`**/*${file_extentions ?? '.trait'}.ts`).scan(rootDir ?? '.');
}

async function findConfigFiles(glob: Glob, root: string, scan: string, trait_files: Set<string>) {
    const old_len = trait_files.size;
    for await (const file of glob.scan(scan)) {

        const config = await import(`${root}/${file}`);
        if (!config.traits) {
            continue;
        }

        console.log(`using config: ${file}`);
        const traits = config.traits;
        if (typeof traits === 'string') {
            if (configStringPredicate(traits)) {
                continue;
            }
            trait_files.add(normalize(`${root}/${traits}`));
        } else if (Array.isArray(traits)) {
            for (let i = 0; i < traits.length; i++) {
                const filename = traits[i]!;
                if (configStringPredicate(filename)) {
                    continue;
                }
                // console.log(`using config: ${filename}`);
                trait_files.add(filename);
            }
        }
    }
    return old_len !== trait_files.size;
}

function configStringPredicate(string: string) {
    return string === '' || !string.endsWith('.ts')
}

function GetImplementations(traitFilePath: string) {

}

function addManySet<T>(set: Set<T>, array: T[]) {
    for (let i = 0; i < array.length; i++) {
        set.add(array[i]!);
    }
}

async function GetTraitFiles(): Promise<string[]> {
    const root = meta.cwd;
    const glob = new Glob('**/traits.{toml, json}');
    const trait_files = new Set<string>();

    if (!await findConfigFiles(glob, root, '.', trait_files)) {
        console.warn('No {traits, trait}.{toml, json} file was found in this project. Falling back to scanning for *.trait.ts');
        addManySet(trait_files, await Array.fromAsync(findTraitFilesFast()));
    }

    return Array.from(trait_files);
}

export function GetTraitMetadata(trait_name: string) {
    return meta.get(trait_name)!;
}

function traverse(node: Node, visit: (node: Node) => Node | undefined) {
    const child = node.forEachDescendant((node, traversal) => {
        if (node.getKind() === SyntaxKind.CallExpression) {
            return node;
        }
    });

    if (child) {
        return traverse(child, visit);
    } else {
        return node;
    }
}

export async function GetTraitDefinitions() {
    const project = new Project();
    const root = meta.cwd;

    let start = performance.now();
    const trait_files = await GetTraitFiles();
    console.log('trait file resolution time: ', (performance.now() - start) / 1000)
    start = performance.now();

    const transpiler = new Bun.Transpiler({
        loader: 'ts',
        allowBunRuntime: true,
        trimUnusedImports: false
    });

    project.forgetNodesCreatedInBlock(() => project.addSourceFilesAtPaths(trait_files));
    for (let i = 0; i < trait_files.length; i++) {
        const filePath = trait_files[i]!;

        const file = await Bun.file(filePath).text();
        const scan = transpiler.scan(file);
        if (!scan.exports.includes('Trait')) {
            continue;
        }

        project.forgetNodesCreatedInBlock(() => {
            const srcFile = project.getSourceFileOrThrow(filePath);
            const fileName = srcFile.getBaseNameWithoutExtension();
            const interfaces = srcFile.getInterfaces();
            const traits: Record<string, TraitMetadata> = {};
            const registered_trait_names: string[] = [];
            if (interfaces.length > 0) {
                parseTraitFile(
                    interfaces.map(i => i.getStructure()),
                    traits,
                    registered_trait_names
                );

                meta.add({
                    name: fileName,
                    filePath: filePath,
                    traits
                });
            }

            const variables = srcFile.getVariableDeclarations().filter(v => registered_trait_names.includes(v.getName()));
            const provided_methods = variables.reduce((acc, variable) => {
                const trait_name = variable.getName();
                const call_expr = variable.getChildrenOfKind(SyntaxKind.CallExpression)[0]!;
                const object_literal = call_expr.getChildrenOfKind(SyntaxKind.ObjectLiteralExpression)[0]!;
                const formatted_methods = object_literal
                    .getProperties()
                    .filter(p => p.isKind(SyntaxKind.MethodDeclaration))
                    .reduce((acc, prop) => {
                        acc[prop.getName()] = prop.getText();
                        return acc;
                    }, {} as Record<string, string>);

                acc[trait_name] = formatted_methods;
                return acc;

            }, {} as Record<string, any>);

            Object.entries(provided_methods).forEach(([key, value]) => {
                meta.setProvided(filePath, key, value);
            });
            // console.log('FORMATTED: ', methods);

            // meta.setProvided(filePath, tra);

        });

    }

    console.log('extract metadata', (performance.now() - start) / 1000);

    start = performance.now();
    const json = JSON.stringify(Object.fromEntries(meta.entries()));
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
