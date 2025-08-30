import { Glob } from "bun";
import { Project, SourceFile, StructureKind, SyntaxKind, TypeAliasDeclaration, TypeChecker, type InterfaceDeclarationStructure, type TypeAliasDeclarationStructure } from 'ts-morph';
import { normalize } from 'node:path';
import { bit } from 'joshkaposh-option'
type Flags = number;
const FLAGS = 0 as number;
const INSTANCE = 1 as number;
const STATIC = 2 as number;
const PROVIDED = 3 as number;
const REQUIRED = 4 as number;

const Flags = {
    flags: FLAGS as number,
    instance: INSTANCE,
    static: STATIC,
    provided: PROVIDED,
    required: REQUIRED,
    check(flags: Flags): Flags {
        if (bit.check(flags, INSTANCE)) {
            bit.clear(flags, STATIC);
        }

        if (bit.check(flags, PROVIDED)) {
            bit.clear(flags, REQUIRED);
        }
        return flags;
    },
    format(flags: Flags) {
        let result = '';
        if ((flags & INSTANCE) !== 0) {
            result += 'instance';
        } else {
            result += 'static';
        }

        if ((flags & PROVIDED) !== 0) {
            result += ", provided";
        } else {
            result += ', required';
        }
        return result;
    }
} as const;

type TraitMetadata = {
    filePath: string;
    name: string;
    methods: {
        all: { name: string; flags: Flags }[];
        static: string[];
        instance: string[];
    };
    implementations: Record<string, string[]>;
};

type MethodMetadata = TraitMetadata['methods'];

// function extractMetadata(aliases: TypeAliasDeclaration[], file_traits: Set<string>, type_checker: TypeChecker, output_map: Map<string, any>) {
//     for (let i = 0; i < aliases.length; i++) {
//         const alias = aliases[i]!;
//         const type = alias.getType(),
//             name = alias.getName();

//         if (file_traits.has(name)) {
//             const properties = type_checker.getPropertiesOfType(type);
//             const required = [];
//             const provided = [];

//             for (let i = 0; i < properties.length; i++) {
//                 const p = properties[i]!;
//                 const name = p.getName();
//                 p.isOptional() ? provided.push(name) : required.push(name);
//             }

//             output_map.set(name, {
//                 name: name,
//                 required: required,
//                 provided: provided,
//                 implementations: []
//             })
//         }

//     }
//     // for (let i = 0; i < array.length; i++) {
//     //     const element = array[i];
//     // }
//     // file_traits.map(name => {
//     //     const alias = srcFile.getTypeAlias(name)!;

//     //     const properties = type_checker.getPropertiesOfType(alias.getType());
//     //     const required = [];
//     //     const provided = [];
//     //     for (let i = 0; i < properties.length; i++) {
//     //         const p = properties[i]!;
//     //         const name = p.getName();
//     //         p.isOptional() ? provided.push(name) : required.push(name);
//     //     }

//     //     return {
//     //         name: name,
//     //         required: required,
//     //         provided: provided,
//     //         implementations: []
//     //     }
//     // });
// }

function parseTraitFileAndSetMetadata(
    project: Project,
    filePath: string,
    aliases: InterfaceDeclarationStructure[],
    type_checker: TypeChecker,
    traits: Map<string, TraitMetadata>,
) {
    console.log('interfaces: ', aliases.map(a => a.name));

    // const file_traits = new Map<string, TraitMetadata>()

    for (let i = 0; i < aliases.length; i++) {
        const alias = aliases[i]!;
        console.log('Interface name: ', alias.name);

        try {
            const methods = alias.methods ?? [];
            const trait_methods: MethodMetadata = {
                all: [],
                static: [],
                instance: [],
            };
            const trait_meta: TraitMetadata = {
                name: alias.name,
                filePath: filePath,
                implementations: Object.create(null),
                methods: trait_methods
            };

            const { all, static: statics, instance } = trait_methods;
            for (let i = 0; i < methods.length; i++) {
                const m = methods[i]!;
                const isStatic = m.parameters?.[0]?.name !== 'this';
                const isProvided = m.hasQuestionToken;
                const name = m.name;

                let flags = Flags.flags;

                flags |= Number(isStatic);
                flags |= Number(isProvided);

                all.push({
                    name: name,
                    flags: flags
                });

                isStatic ?
                    statics.push(name) :
                    instance.push(name);

            }

            traits.set(alias.name, trait_meta);

        } catch (error) {
            const name = alias.name;
            throw new Error(`Failed to parse ${name}. expected this type be in the form of "type ${name} = [TraitName]"`)
        }
    }
}

function findTraitFilesFast() {
    const s = performance.now()
    const files = new Glob('**/*.trait.ts').scan('.');
    console.log('findTraitFilesFast: ', (performance.now() - s) / 1000);
    return files;
}

async function findConfigFiles(glob: Glob, root: string, scan: string, trait_files: Set<string>) {
    const old_len = trait_files.size;
    const start = performance.now();
    for await (const file of glob.scan(scan)) {
        console.log(`config ${file}`);

        const config = await import(`${root}/${file}`);
        if (!config.traits) {
            continue;
        }

        const traits = config.traits;
        if (typeof traits === 'string') {
            if (configStringPredicate(traits)) {
                continue;
            }
            console.log('using config file');
            trait_files.add(normalize(`${root}/${traits}`));
        } else if (Array.isArray(traits)) {
            for (let i = 0; i < traits.length; i++) {
                const filename = traits[i]!;
                if (configStringPredicate(filename)) {
                    continue;
                }
                console.log('using config file');
                trait_files.add(filename);
            }
        }
    }
    console.log('scanned config files in ', (performance.now() - start) / 1000);
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

export async function GetTraits(force_crawl?: boolean) {
    const project = new Project();
    const traits = new Map();
    const type_checker = project.getTypeChecker();

    const root = process.cwd();
    const glob = new Glob('**/traits.{toml, json}');

    // if (files == null || files === '') {
    //     files = [];
    // } else if (typeof files === 'string') {
    //     files = [files];
    // }

    // console.log('Config files: ', files);

    const trait_files = new Set<string>();

    if (!await findConfigFiles(glob, root, '.', trait_files)) {
        console.warn('No {traits, trait}.{toml, json} file was found in this project. Falling back to scanning for *.trait.ts');
        addManySet(trait_files, await Array.fromAsync(findTraitFilesFast()));
    }
    console.log('after findConfigFiles', trait_files);

    let start = performance.now();

    project.forgetNodesCreatedInBlock(() => {
        const trait_file_arr = Array.from(trait_files)
        project.addSourceFilesAtPaths(trait_file_arr);
        console.log("Trait Paths: ", trait_file_arr);

        for (let i = 0; i < trait_file_arr.length; i++) {
            const filePath = trait_file_arr[i]!;
            const srcFile = project.getSourceFileOrThrow(filePath);
            const interfaces = srcFile.getInterfaces().map(i => i.getStructure());
            parseTraitFileAndSetMetadata(project, filePath, interfaces, type_checker, traits);
        }
    });

    console.log('parse traits.ts from config', (performance.now() - start) / 1000);

    const output = Object.fromEntries(traits.entries());

    await Bun.file(`${root}/.trait-metadata.json`).write(JSON.stringify(output));
    return output;
}

// if (force_crawl) {
//     addManySet(trait_files, await Array.fromAsync(findTraitFilesFast()));
// }
