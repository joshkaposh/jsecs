import { Glob } from "bun";
import { Project, type ClassDeclarationStructure } from "ts-morph";
import { normalizePath } from "@repo/macros";

export type ProcessedFile<T> = {
    fileName: string;
    filePath: string;
    data: T;
};

export type ClassStructure = {
    struct: ClassDeclarationStructure;
    implementations: string[];
};


export class Ast {
    #__root?: string;
    #initialized: boolean;
    #project: Project;
    constructor(
        root?: string
    ) {
        const project = new Project({
            skipAddingFilesFromTsConfig: true
        });

        this.#__root = root;
        this.#initialized = typeof root === 'string';
        this.#project = project;
    }

    static post(ast: Ast) {
        return async (request: Request) => {
            try {
                const body = await request.json() as { decorator_filter?: string[], class_name?: string };
                if (!body.decorator_filter) {
                    return Response.error();
                }

                const structs = ast.querySync(body.decorator_filter);
                return Response.json(structs);

            } catch (error) {
                console.error(error)
                return Response.error();
            }
        }
    }

    // static webSocket(ast: Ast) {

    // }

    /**
     * #Throws
     * @throws Accessing this property will throw an Error if `root` was not specified.
     */
    get root() {
        if (!this.#initialized) {
            throw new Error('`Ast` expected to have a root at this point. You probably tried calling a method such as `query` or `modify` before specifying a root, which is not allowed.')
        }
        return this.#__root!;
    }

    setRoot(root: string) {
        if (this.#initialized) {
            throw new Error("`Ast`'s root was already initialized. Specifying another project root is not allowed.");
        }
        this.#__root = root;
    }

    async query<const F extends AsyncIterableIterator<string>>(filter: F) {
        return queryInternal(this.root, filter, this.#project);
    }

    querySync<const F extends string[]>(filter: F) {
        return queryInternalSync(this.root, filter, this.#project);
    }

}



// /**
//  * This function performs the same as `getClassesSync`,
//  * except the filter is a predefined array of Decorator names to search for.
//  *
//  * somedir/src/my-class.ts
//  * ```typescript
//  * \@MyCustomDecorator
//  * export class MyClass {}
//  * ```
//  * later...
//  * ``` typescript
//  * const structs = getClassStructuresStaticSync("somedir/src", ["MyCustomDecorator"]);
//  * // output will be [{
//  * //     fileName: "my-class.ts",
//  * //     ...other metadata
//  * //     data: ClassDeclartationStructure
//  * //}]
//  * ```
//  *
//  * @returns the valid class `Structure(s)` under the supplied filter.
//  */
// export function getClassStructuresStaticSync<const F extends string[]>(
//     projectDir: string,
//     filter: F
// ) {

//     return __queryInternalSync(
//         initializeProject(projectDir),
//         (s) => getStructuresSync(s, filter),
//         projectDir,

//     );
// }


// export function getClassStructuresStatic<F extends AsyncIterableIterator<string>>(
//     projectDir: string | URL,
//     filter: F
// ): Promise<ProcessedFile<ClassStructure>> {

//     return __queryInternal(
//         initializeProject(projectDir),
//         (s) => getStructures(s, filter),
//         projectDir
//     ) as unknown as Promise<ProcessedFile<ClassStructure>>
// }

// /**
//  *
//  *
//  *
//  * @returns the valid class `Structure(s)` under the supplied filter.
//  */
// export function getClassesSync<Data>(
//     projectDir: string,
//     filter: (declaration: ClassDeclarationStructure) => Data,
//     project?: Project
// ) {
//     return __queryInternalSync(
//         initializeProject(projectDir, undefined, project),
//         filter,
//         projectDir,
//     )
// }

// export async function getClasses<Data>(
//     projectDir: string,
//     filter: (declaration: ClassDeclarationStructure) => Data,
//     project?: Project
// ) {

//     return __queryInternal(
//         initializeProject(projectDir, undefined, project),
//         filter,
//         projectDir,
//     );
// }

function processValidFiles<T>(
    srcFile: ReturnType<Project['getSourceFileOrThrow']>,
    filePath: string,
    filter: (struct: ClassDeclarationStructure) => T,
    valid_files: ProcessedFile<T>[],
) {
    const classes = srcFile.getClasses();
    for (let i = 0, l = classes.length; i < l; i++) {
        const declaration = classes[i]!;
        const result = filter(declaration.getStructure());
        if (result) {
            valid_files.push({
                fileName: srcFile.getBaseName(),
                filePath: filePath,
                data: result
            });
        }
    }
}

function getSourceFile(project: Project, path: string) {
    const srcFile = project.getSourceFile(path);
    if (srcFile) {
        return srcFile;
    }
    return project.addSourceFileAtPathIfExists(path);
}

function getSourceFileOrThrow(project: Project, path: string) {
    const file = getSourceFile(project, path);
    if (!file) {
        throw new Error(`Failed to retrieve source file at path [${path}]`)
    }

    return file;
}


function queryInternal(root: string, filter: AsyncIterableIterator<string>, project: Project) {
    return __queryInternal(
        project,
        (s) => getStructure(s, filter),
        root
    );
}

function queryInternalSync(root: string, filter: string[], project: Project) {
    return __queryInternalSync(
        project,
        (s) => getStructureSync(s, filter),
        root
    );
}

async function __queryInternal<Data>(
    project: Project,
    filter: (declaration: ClassDeclarationStructure) => Data,
    projectDir: string | URL,
) {
    const files = new Glob('src/**/*.ts').scan(`${projectDir}`);
    const valid_files: ProcessedFile<Data>[] = [];

    for await (const _filePath of files) {
        const filePath = normalizePath(`${projectDir}/${_filePath}`);
        const file = getSourceFileOrThrow(project, filePath);
        processValidFiles(file, filePath, filter, valid_files);
    }

    return valid_files;
}

function __queryInternalSync<Data>(
    project: Project,
    filter: (declaration: ClassDeclarationStructure) => Data,
    projectDir: string,
) {
    const files = Array.from(new Glob('src/**/*.ts').scanSync(projectDir));
    const valid_files: ProcessedFile<NonNullable<Data>>[] = [];

    for (let i = 0, l = files.length; i < l; i++) {
        const filePath = normalizePath(`${projectDir}/${files[i]}`);
        const file = getSourceFileOrThrow(project, filePath);
        processValidFiles(file, filePath, filter, valid_files);
    }

    return valid_files;
}

async function getStructure(struct: ClassDeclarationStructure, filter: AsyncIterableIterator<string>) {
    const decorators = struct.decorators;
    const implementations = [];

    if (!decorators || decorators.length === 0) {
        return;
    }

    for await (const f of filter) {
        // check if any decorator is included in `filter`.
        for (let i = 0; i < decorators.length; i++) {
            const d = decorators[i];
            if (d?.name === f) {
                implementations.push(f);
            }
        }
    }

    if (implementations.length > 0) {
        return {
            struct,
            implementations
        }
    }
}

function getStructureSync(struct: ClassDeclarationStructure, filter: string[]) {
    const decorators = struct.decorators;
    const implementations = [];

    if (decorators && decorators.length > 0) {
        // check if any decorator is included in `filter`.
        for (let i = 0; i < decorators.length; i++) {
            const d = decorators[i];
            for (let j = 0; j < filter.length; j++) {
                const f = filter[j]!;
                if (d?.name === f) {
                    implementations.push(f);
                }
            }
        }
    }

    if (implementations.length > 0) {
        return {
            struct,
            implementations
            // struct,
            // implementations: names
        }
    }
}
