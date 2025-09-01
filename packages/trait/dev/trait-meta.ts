import { Glob } from 'bun';
import { bit } from 'joshkaposh-option'
import { Project, SyntaxKind, type InterfaceDeclarationStructure } from 'ts-morph';
import { normalize } from 'node:path'
export type Flags = number;
export const FLAGS = 0 as number;
export const INSTANCE = 1 as number;
export const STATIC = 2 as number;
export const PROVIDED = 3 as number;
export const REQUIRED = 4 as number;

const CHARS: Record<string, number> = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
} as const;

export const Flags = {
    flags: FLAGS as number,
    instance: INSTANCE,
    static: STATIC,
    provided: PROVIDED,
    required: REQUIRED,
    deserialize(str: `${Flags}${string}`) {
        let flags = 0;
        let index = 0;
        while (true) {
            const char = str[index]!;
            if (char in CHARS) {
                index++;
                flags |= CHARS[char]!;
            } else {
                return [flags, str.slice(index)] as [number, string];
            }
        }
    },
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

        if (bit.check(flags, INSTANCE)) {
            result += 'instance';
        } else {
            result += 'static';
        }

        if (bit.check(flags, PROVIDED)) {
            result += ", provided";
        } else {
            result += ', required';
        }

        return result;
    }
} as const;

export type TraitMetadata = {
    name: string;
    // flags: Record<string, Flags>;
    methods: {
        flags: Flags[];
        names: string[];
        provided: Map<number, string | null>;
    };
    implementations: Record<string, string[]>;
};

export type TraitFile = {
    name: string;
    filePath: string;
    traits: Record<string, TraitMetadata>;
};

export type TraitsMetadata = Record<string, TraitFile>;
export type MethodMetadata = TraitMetadata['methods'];

export class TraitMeta {
    #indices: Map<string, number>;
    #files: TraitFile[];
    /**
     * lookup map for getting traits by name
     */
    #by_trait: Map<string, number[]>;
    readonly cwd: string;
    constructor(cwd: string) {
        this.#indices = new Map();
        this.#by_trait = new Map();
        this.#files = [];
        this.cwd = cwd;
    }

    #addByTrait(index: number, file: TraitFile) {
        const traits = file.traits;
        const by_trait = this.#by_trait;
        for (const key in traits) {
            const t = traits[key]!;
            const name = t.name;
            let by = by_trait.get(name);
            if (by == null) {
                by_trait.set(name, [index]);
            } else {
                by.push(index);
            }
        }
    }

    add(file: TraitFile) {
        if (this.#indices.has(file.filePath)) {
            return;
        }

        const index = this.#indices.size;
        this.#indices.set(file.filePath, index);
        this.#files[index] = file;
        this.#addByTrait(index, file);
    }

    #parseFile(
        aliases: InterfaceDeclarationStructure[],
        traits: Record<string, TraitMetadata>,
        trait_names: string[]
    ) {
        for (let i = 0; i < aliases.length; i++) {
            const alias = aliases[i]!;
            const alias_methods = alias.methods ?? [];
            const trait_methods: MethodMetadata = {
                flags: [],
                names: [],
                provided: new Map(),
            };

            const trait_meta: TraitMetadata = {
                name: alias.name,
                implementations: Object.create(null),
                methods: trait_methods,
            };

            const { names, provided, flags: trait_flags } = trait_methods;
            // const { all, names, static: statics, instance, required, provided } = trait_methods;
            // const { methodNames, provided, flags: trait_flags } = trait_meta;

            for (let i = 0; i < alias_methods.length; i++) {

                const m = alias_methods[i]!;
                const isStatic = m.parameters?.[0]?.name !== 'this';
                const isProvided = m.hasQuestionToken ?? false;
                const name = m.name;

                let flags = Flags.flags;

                flags = bit.set(flags, isStatic ? Flags.static : Flags.instance);
                flags = bit.set(flags, isProvided ? Flags.provided : Flags.required);

                names[i] = name;
                trait_flags[i] = flags;
                if (isProvided) {
                    provided.set(i, null);
                }

                // provided.set(i, null);
                // provided[name] = null;
                // names.push(name);
                // flags[name] = flags
                // methodNames.push(name);
                // trait_flags[name] = flags;

            }


            trait_names.push(trait_meta.name);
            traits[trait_meta.name] = trait_meta;
        }
    }

    entries() {
        return this.#files.entries();
    }

    traitFiles() {
        return JSON.stringify(this.#files);
    }

    async parseFiles(trait_files: string[]) {
        const transpiler = new Bun.Transpiler({
            loader: 'ts',
            allowBunRuntime: true,
            trimUnusedImports: false
        });

        const project = new Project();
        project.forgetNodesCreatedInBlock(() => project.addSourceFilesAtPaths(trait_files));

        const self = this;

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
                    self.#parseFile(
                        interfaces.map(i => i.getStructure()),
                        traits,
                        registered_trait_names
                    );

                    self.add({
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

                for (const key in provided_methods) {
                    self.setProvided(filePath, key, provided_methods[key]);
                }
            });

        }
    }

    async findConfigFiles(glob: Glob, root: string, scan: string, trait_files: Set<string>) {
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


    async findTraitFiles() {
        const root = this.cwd;
        const glob = new Glob('**/traits.{toml, json}');
        const trait_files = new Set<string>();

        if (!await this.findConfigFiles(glob, root, '.', trait_files)) {
            console.warn('No {traits, trait}.{toml, json} file was found in this project. Falling back to scanning for *.trait.ts');
            addManySet(trait_files, await Array.fromAsync(new Glob('**/*.trait.ts').scan('.')));
        }

        return Array.from(trait_files);

    }

    addFiles(files: TraitFile[]) {
        for (let i = 0; i < files.length; i++) {
            this.add(files[i]!)
        }
    }

    getByPath(filepath: string) {
        const idx = this.#indices.get(filepath);
        if (idx == null) {
            return;
        }

        return this.#files[idx];
    }

    getTraits(trait_name: string) {
        const indices = this.#by_trait.get(trait_name);
        if (!indices) {
            return;
        }
        return Array.from({ length: indices.length }, (_, i) => this.#files[i]!.traits[trait_name]!);
    }

    get(trait_name: string) {
        const traits = this.getTraits(trait_name);
        if (traits && traits.length === 1) {
            return traits[0];
        }
    }

    getTraitFile(filePath: string) {
        const index = this.#indices.get(filePath);
        if (index == null) {
            return;
        }
        return this.#files[index];

    }

    getTrait(filePath: string, name: string) {
        const index = this.#indices.get(filePath);
        if (index == null) {
            return;
        }
        return this.#files[index]!.traits[name];
    }

    setProvided(file_path: string, trait_name: string, methods: Record<string, string>) {
        const trait = this.getTrait(file_path, trait_name);
        if (!trait) {
            return;
        }

        const meta_methods = trait.methods;
        const names = meta_methods.names,
            flags = meta_methods.flags,
            provided = meta_methods.provided;

        for (let i = 0; i < flags.length; i++) {
            const f = flags[i]!;
            if (bit.check(f, Flags.provided)) {
                provided.set(i, methods[names[i]!]!);
            }
        }
        // for (const key in methods) {
        //     provided[key] = methods[key]!;
        // }
    }
}

function configStringPredicate(string: string) {
    return string === '' || !string.endsWith('.ts')
}

function addManySet<T>(set: Set<T>, array: T[]) {
    for (let i = 0; i < array.length; i++) {
        set.add(array[i]!);
    }
}

