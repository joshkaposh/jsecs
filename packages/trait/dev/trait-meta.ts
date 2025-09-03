import { Glob, TOML } from 'bun';
import { FunctionDeclaration, InterfaceDeclaration, MethodDeclaration, Project, SymbolFlags, SyntaxKind, VariableDeclaration, type MethodSignatureStructure, type OptionalKind } from 'ts-morph';
import { TraitError } from '../src/trait';
import { Flags } from '../src/flags';

type MethodStructureAndCode = { structure: MethodSignatureStructure; code: string };

export class TraitMetadata {
    readonly name: string;
    // start
    readonly flags: Flags[];
    readonly names: string[];
    readonly implementations: Record<string, string[]>;
    default_initializers: Map<number, MethodStructureAndCode>;
    declarations: Record<string, MethodDeclaration>;

    private constructor(
        name: string,
        names?: string[],
        flags?: Flags[],
        default_initializers?: Map<number, { code: string; structure: MethodSignatureStructure }>,
        implementations?: Record<string, string[]>
    ) {
        this.name = name;
        this.names = names ?? [];
        this.flags = flags ?? [];
        this.default_initializers = default_initializers ?? Object.create(null);
        this.implementations = implementations ?? Object.create(null);
        this.declarations = {};
    }

    static fromMethods(name: string, interface_methods: MethodSignatureStructure[],
        variable_methods: MethodStructureAndCode[]
    ) {


        const var_dict = variable_methods.reduce((acc, x) => {
            acc[x.structure.name] = x;
            return acc;
        }, {} as Record<string, MethodStructureAndCode>);

        const names = interface_methods.map(i => i.name);
        const flags = new Array(names.length);
        const default_initializers = new Map<number, MethodStructureAndCode>();

        for (let i = 0; i < names.length; i++) {
            const m = interface_methods[i];
            if (!m) {
                continue
            }

            const isStatic = m.parameters?.[0]?.name !== 'this';
            const isProvided = m.hasQuestionToken ?? false;
            const mask = Flags.mask(isStatic, isProvided);

            flags[i] = mask;

            if (isProvided) {
                default_initializers.set(i, var_dict[m.name]!);
            }
        }

        return new TraitMetadata(name, names, flags, default_initializers);
    }

    serialize() {
        const { names, flags, default_initializers } = this;
        return {
            name: this.name,
            methods: {
                names: names,
                flags: flags,
                provided: Object.fromEntries(default_initializers.entries())
            },

        };
    }
}

export class TraitFile {
    readonly name: string;
    readonly filePath: string;
    readonly traits: Record<string, TraitMetadata>;

    constructor(name: string, filePath: string, traits?: Record<string, TraitMetadata>) {
        this.name = name;
        this.filePath = filePath;
        this.traits = traits ?? Object.create(null);
    }

    addMetadata(trait: TraitMetadata) {
        this.traits[trait.name] = trait;
    }

    serialize() {
        return {
            name: this.name,
            filePath: this.filePath,
            traits: Object.fromEntries(
                Object.entries(this.traits).map(([k, v]) => [k, v.serialize()])
            )
        }
    }
}

type ConfigFile = {
    definitions?: string;
    implementations?: string;
    exact?: string[];
};

const ParseError = {
    ExpectedValue(property_name: string | number, property_value: string | number, message: string | number) {
        return new Error(`Expected ${property_name} to be of type ${property_value}, ${message}`);
    }
} as const;

function parseConfigFile(config: ConfigFile): [exact: boolean, paths: Set<string>] {
    const paths = new Set<string>();
    if (config.exact) {
        const exact = config.exact;
        if (Array.isArray(exact)) {
            for (let i = 0; i < exact.length; i++) {
                const path = exact[i]!;
                const ty = typeof path;
                if (ty === 'string' && path !== '') {
                    paths.add(path);
                    continue;
                }
                throw ParseError.ExpectedValue(i, 'string', ty);
            }
        } else {
            throw ParseError.ExpectedValue('exact', 'array', `but was of type ${typeof config.exact}`)
        }
        // Bun.dee

        return [true, paths]
    } else {
        const definitions = config.definitions;
        const ty = typeof definitions
        if (ty === 'string' && definitions !== '') {
            paths.add(definitions as string);
        } else {
            throw ParseError.ExpectedValue('definitions', 'string', `but was of type ${ty}`)
        }
        return [false, paths];
    }

}

function formatConfigFileExtention(extension: string) {
    return `${extension}${extension.endsWith('.ts') ? '' : '.ts'}`

}

export class Traits {
    #indices: Map<string, number>;
    #files: TraitFile[];
    /**
     * lookup map for getting traits by name
     */
    #by_trait: Map<string, number[]>;
    #transpiler: Bun.Transpiler;
    #config?: {
        definitions: string;
        implementations: string;
    };

    readonly cwd: string;

    constructor(cwd: string) {
        this.#indices = new Map();
        this.#by_trait = new Map();
        this.#transpiler = new Bun.Transpiler({
            loader: 'ts'
        });
        this.#files = [];
        this.cwd = cwd;
    }

    get config() {
        const cfg = this.#config;
        if (!cfg) {
            throw new Error('Expected `Traits.config` to be initialized at this point')
        }
        return cfg;
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

    addFiles(files: TraitFile[]) {
        for (let i = 0; i < files.length; i++) {
            this.add(files[i]!)
        }
    }

    async parseImplementationFile() {

    }

    async parseFiles(trait_files: string[]) {

        const project = new Project();
        const transpiler = this.#transpiler;
        project.forgetNodesCreatedInBlock(() => project.addSourceFilesAtPaths(trait_files));
        for (let i = 0; i < trait_files.length; i++) {
            const filePath = trait_files[i]!;

            // const file = await Bun.file(filePath).text();
            // const scan = transpiler.scan(file);
            // if (scan.imports.findIndex(v => v.path.endsWith('trait')) === -1) {
            //     // parse potential trait implementation file
            //     continue;
            // }

            const traitSrcFile = project.forgetNodesCreatedInBlock(() => project.getSourceFileOrThrow(filePath));
            const traitFileName = traitSrcFile.getBaseNameWithoutExtension();

            project.forgetNodesCreatedInBlock(() => {
                const trait_file = new TraitFile(traitFileName, filePath);
                const srcFile = traitSrcFile;

                let trait_index!: number;

                // const import_declaration = srcFile.getImportDeclaration(dec => {
                //     trait_index = dec.getNamedImports().findIndex(specifier => specifier.getName() === 'Trait');
                //     return trait_index !== -1;
                // });

                // if (import_declaration) {
                //     console.log('IMPORT DECLARATION');

                //     const trait = import_declaration.getModuleSpecifierSourceFile();
                //     console.log('TRAIT FILE NAME::', trait?.getBaseName());

                //     // trait_src_file.getDescendantsOfKind(SyntaxKind.FunctionDeclaration).forEach(f => console.log('TRAIT FILE::::', f.getName()));
                //     // trait_src_file.getChildrenOfKind(SyntaxKind.ExportDeclaration).forEach(f => {
                //     //     console.log('TRAIT SOURCE CODE: ', f.getChildrenOfKind(SyntaxKind.FunctionDeclaration).map(f => f.getName()));

                //     // });
                //     // console.log('TRAIT IMPORT: ', trait_declaration.getName());
                //     // tra
                //     // const referencedSymbols = trait_declaration.findReferences();
                //     // for (const referencedSymbol of referencedSymbols) {
                //     //     for (const reference of referencedSymbol.getReferences()) {
                //     //         console.log("---------")
                //     //         console.log("REFERENCE")
                //     //         console.log("---------")
                //     //         console.log("File path: " + reference.getSourceFile().getFilePath());
                //     //         console.log("Start: " + reference.getTextSpan().getStart());
                //     //         console.log("Length: " + reference.getTextSpan().getLength());
                //     //         console.log("Parent kind: " + reference.getNode().getParentOrThrow().getKindName());
                //     //         console.log("\n");
                //     //     }
                //     // }
                // }

                /**
                 * Each key in `TraitsProvidedMeta` is a trait name,
                 * each value is a Record of method names and declarations
                 */
                const registered_traits = new Map<string, number>();

                const interfaces = srcFile.getInterfaces();
                const trait_meta = this.#getVariables(registered_traits, srcFile.getVariableDeclarations());
                const type_names = this.#getInterfaces(trait_file, trait_meta, interfaces, registered_traits)

                if (type_names.length !== registered_traits.size) {
                    throw TraitError.NoTypeFound(type_names);
                }
                this.add(trait_file);
            });
        }


    }

    async findTraitFiles(root: string) {
        const files = await this.#findAndParseConfigFiles(root);
        if (!files.length) {
            throw new Error('No config trait.toml file was found in this project');
        }

        return Array.from(new Glob(`**/*{${files.join(', ')}}`).scanSync(root));
    }

    async findTraitImplementations(root: string) {
        const implementation_files = new Set<string>();
        const file_names = Array.from(new Glob('**/*.impl.{ts, tsx}').scanSync(root));
        // Bun.
        // for (const file of file_names) {
        //     // console.log((await Bun.file(file).text()).length);
        //     transpiler.scan(await Bun.file(file).text())
        // }
        // const trait_names = this.#files
        console.log('Starting implementation...');
        // for (const file of glob) {
        //     console.log('', file);

        //     const scan = transpiler.scan(await Bun.file(file).arrayBuffer());

        //     // scan.imports.forEach(i => {
        //     // console.log(i.path);
        //     // })
        // }

    }

    getByPath(filepath: string) {
        const idx = this.#indices.get(filepath);
        if (idx == null) {
            return;
        }

        return this.#files[idx];
    }

    get(trait_name: string) {
        const traits = this.getTraits(trait_name);
        if (traits && traits.length === 1) {
            return traits[0];
        }
    }

    getTrait(filePath: string, name: string) {
        const index = this.#indices.get(filePath);
        if (index == null) {
            return;
        }
        return this.#files[index]!.traits[name];
    }

    getTraits(trait_name: string) {
        const indices = this.#by_trait.get(trait_name);
        if (!indices) {
            return;
        }
        return Array.from({ length: indices.length }, (_, i) => this.#files[i]!.traits[trait_name]!);
    }

    getTraitFile(filePath: string) {
        const index = this.#indices.get(filePath);
        if (index == null) {
            return;
        }
        return this.#files[index];
    }

    entries() {
        return this.#files.entries();
    }

    serialize(indentation?: number) {
        return JSON.stringify(this.#serialize(), null, indentation);
    }

    // async #isTraitFile(transpiler: Bun.Transpiler, text: string) {
    // return transpiler.scan(text).imports.findIndex(v => v.path.endsWith('trait')) !== -1
    // }


    async #findAndParseConfigFiles(root: string) {
        const glob_filter = '{trait, traits}.{toml}'
        const glob = new Glob(`**/${glob_filter}`);


        // const old_len = trait_files.size;
        const file_extensions = [];
        for await (const file of glob.scan(root)) {

            const config = TOML.parse(await Bun.file(file).text()) as Record<string, any>;

            parseConfigFile(config);
            const { definitions, implementations } = config;

            if (!definitions) {
                continue;
            }

            const traits = definitions;
            if (typeof traits === 'string') {
                if (!traits) {
                    continue;
                }


                file_extensions.push(`${traits}${traits.endsWith('.ts') ? '' : '.ts'}`);
            } else if (Array.isArray(traits)) {
                for (let i = 0; i < traits.length; i++) {
                    const extension = traits[i]!;
                    if (!extension) {
                        continue;
                    }
                    file_extensions.push(formatConfigFileExtention(extension))
                }
            }
        }

        return file_extensions;
    }

    #registerTraitDeclaration(declaration: FunctionDeclaration) { }

    #getVariables(registered_traits: Map<string, number>, unfiltered_variables: VariableDeclaration[]) {
        // const unfiltered_variables = srcFile.getVariableDeclarations();

        for (let i = 0; i < unfiltered_variables.length; i++) {
            const declaration = unfiltered_variables[i]!;
            const initializer = declaration.getInitializer();
            const children = initializer?.getChildrenOfKind(SyntaxKind.Identifier).map(i => i.getText());
            if (children && children[0] === 'Trait') {
                registered_traits.set(declaration.getName(), i);
            }
        }

        // get methods provided by the trait
        const variables = registered_traits.entries().map(([_, i]) => unfiltered_variables[i]!).toArray();

        const trait_meta: Record<string, any> = {};

        for (let j = 0; j < variables.length; j++) {
            const variable = variables[j]!;
            const trait_name = variable.getName();
            console.log('trait name', trait_name);

            const call_expr = variable.getChildrenOfKind(SyntaxKind.CallExpression)[0]!;
            const object_literal = call_expr.getChildrenOfKind(SyntaxKind.ObjectLiteralExpression)[0]!;
            // object_literal.getParentInd
            const provided_methods: Record<string, any> = {};
            const properties = object_literal.getProperties();
            const registeredIdentifiers = [];
            for (let k = 0; k < properties.length; k++) {
                const method = properties[k]!;
                if (method.isKind(SyntaxKind.MethodDeclaration)) {
                    provided_methods[method.getName()] = { declaration: method, code: method.getText() };
                    const body = method.getBody()!;
                    // console.log(body);


                    body.getDescendantStatements();
                    // console.log(body.getDescendantStatements().map(v => {
                    //     const kind = v.getKind();
                    //     if (v.isKind(SyntaxKind.ExpressionStatement)) {
                    //         v.getSymbolsInScope(SymbolFlags.FunctionScopedVariable).map(v => v.)
                    //     }
                    // }));

                    // method.getChildSyntaxList()?.forEachDescendant(n => {
                    //     console.log('syntax list kind', n.getKindName());

                    // });

                    // console.log(method.getScope());
                    // method.getStatements().forEach(s => {
                    //     if
                    // });
                    // console.log(body.getKindName());
                    console.log('STRUCTURE', method.getName(), method.getStructure().scope);

                    // const symbols = body.getSymbolsInScope(SymbolFlags.FunctionScopedVariable)[0]?.getName();
                    // console.log(symbols);

                    // if (body.isKind(TsSyntaxKind.Body)) {
                    // }
                }
            }

            trait_meta[trait_name] = provided_methods;
        }

        return trait_meta
    }

    #getInterfaces(
        file: TraitFile,
        trait_meta: Record<string, Record<string, { code: string; structure: MethodSignatureStructure }>>,
        interfaces: InterfaceDeclaration[],
        registered_traits: ReadonlySetLike<string>,
    ) {

        const type_names = [];
        for (let i = 0; i < interfaces.length; i++) {
            const type = interfaces[i]!;
            const type_name = type.getName();
            if (!registered_traits.has(type_name)) {
                continue
            }
            const alias = type.getStructure();
            if (!alias.methods) {
                throw TraitError.NoTypeMethods(type_name);
            }

            type_names.push(type_name);
            const provided_methods = trait_meta[type_name]!;

            const provided_input = alias.methods?.filter(m => m.name in provided_methods).map(m => {
                const code = provided_methods[m.name]!.code;
                return {
                    structure: m as MethodSignatureStructure,
                    code: code as string
                };
            }) ?? [];

            file.addMetadata(TraitMetadata.fromMethods(
                type_name,
                alias.methods as MethodSignatureStructure[],
                provided_input
            ));
        }
        return type_names;
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

    #serialize() {
        return this.#files.map(file => {
            const traits = file.traits;
            const serialized_traits = Object.fromEntries(Object.entries(traits).map(([k, meta]) => [k, meta.serialize()]));
            return {
                name: file.name,
                filePath: file.filePath,
                traits: serialized_traits
            }
        })
    }

}

function addManySet<T>(set: Set<T>, array: T[]) {
    for (let i = 0; i < array.length; i++) {
        set.add(array[i]!);
    }
}

