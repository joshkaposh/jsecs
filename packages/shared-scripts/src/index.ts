import { normalize } from 'node:path';

function nanoToSec(nanoseconds: number) {
    return nanoseconds / 1e+9;
}

type Config = {
    in: string | URL | string[];
    out: string;
    minify?: boolean;
    verbose?: boolean;
    target?: 'node' | 'bun' | 'browser';
    tsconfig?: string;
};

export async function build(config: {
    in: URL | boolean | string | undefined | string[];
    out: URL | boolean | string | undefined;
    options?: Omit<Bun.BuildConfig, 'entrypoints' | 'outdir'>;
} & Omit<Config, 'in' | 'out'>
) {
    const VERBOSE = config.verbose;
    const START = Bun.nanoseconds();

    if (VERBOSE) {
        console.log('Starting build...');
    }

    const root = process.cwd();
    const path = await getInputPath(root, config.in);

    if (!path) {
        console.error('Failed to provide a valid entry point(s)');
        return;
    }

    if (config.out == null || typeof config.out === 'boolean') {
        console.error('Failed to provide an out directory');
        return;
    }

    await Bun.build({
        target: 'bun',
        ...config,
        ...config.options,
        entrypoints: Array.isArray(path) ? path : [path],
        outdir: normalize(`${root}/${config.out}`),
    });

    if (VERBOSE) {
        console.log(config.tsconfig);

        console.log(`Build complete in ${nanoToSec(Bun.nanoseconds() - START)} seconds`);
    }
}

export default build;

if (process.argv.length > 2) {
    const { parseArgs } = await import('util')
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            in: { type: 'string' },
            out: { type: 'string' },
            minify: { type: 'boolean' },
            target: { type: 'string' },
            tsconfig: { type: 'string' },
            verbose: { type: "boolean" }
        },
        strict: true,
        allowPositionals: true
    });

    if (values.tsconfig && values.verbose) {
        console.log('Using provided tsconfig...');
    }

    await build({
        in: values.in,
        out: values.out,
        tsconfig: values.tsconfig,
        minify: values.minify,
        verbose: values.verbose,
        options: values as any
    });
}

function result<const T>(fn: () => T) {
    try {
        return fn();
    } catch (error) {
        if (Error.isError(error)) {
            return error;
        }
    }
}

async function getJson(root = process.cwd(), file: string): Promise<undefined | Record<string, any>> {
    return await result(() => Bun.file(normalize(`${root}/${file}`)).json());
}

async function getRelative(cwd: string, input_path: string): Promise<string | string[]> {
    /**
     * search package.json for:
     * - "module" field
     * - "exports": {
     *      - "bun"     
     *      - "import"
     * 
     *      - ".": {
     *           import: "string"
     *           default: "string"
     *        } | string
     * 
     *      - "default"
     *  }
     */
    const jsonfile = Bun.file(normalize(`${cwd}/package.json`));
    const json = await result(() => jsonfile.json());

    if (json) {
        const { module, main, exports } = json;
        if (module && !exports) {
            return module;
        } else if (!module && main) {
            return main;
        } else if (exports) {
            const { bun, node, default: _default } = exports;
            if (bun) {
                return bun;

            } else if (node) {
                return node;
            } else if (exports['.']) {
                const idx = exports['.'];
                if (idx['import']) {
                    return idx['import'];
                } else if (idx['default']) {
                    return idx['default'];
                }
            } else if (_default) {
                return _default
            } else {
                throw new Error('Could not find')
            }
        }
    }


    const tsconfig = await getJson(cwd, 'tsconfig.json');
    // const tsconfig_file = Bun.file(normalize(`${cwd}/tsconfig.json`));
    // const tsconfig = await result(() => tsconfig_file.json());

    if (!tsconfig || !tsconfig['compilerOptions']) {
        throw new Error(`Cannot find an input with the specified path: ${normalize(`${cwd}${input_path}`)}`)
    } else {
        /**
         * 
         * search tsconfig for:
         * - "compilerOptions"
         *      - "outDir": "..."
         *      - "outDirs": ["...",]
         */
        if (tsconfig['compilerOptions']['rootDir']) {
            return tsconfig.compilerOptions.rootDir;
        } else if (tsconfig['compilerOptions']['rootDirs']) {
            return tsconfig.compilerOptions.rootDirs;
        } else {
            throw new Error(`Cannot find an input with the specified path: ${normalize(`${cwd}${input_path}`)}`)
        }
    }

}

async function getInputPath(root: string, potential_path: unknown, verbose?: boolean): Promise<string | (string[]) | void> {
    if (potential_path instanceof URL || typeof potential_path === 'string') {
        potential_path = potential_path.toString();

        if (potential_path === '.' || potential_path === './') {

            const start = verbose ? Bun.nanoseconds() : 0;
            const path = await getRelative(root, potential_path);

            if (verbose) {
                console.log(`getRelative took ${nanoToSec(Bun.nanoseconds() - start)}`);
            }

            if (!path) {
                return;
            }
            return path;
        }

        try {
            new Response(Bun.file(potential_path as string));
        } catch (error) {
            console.error(`Failed to provide a valid index file. ${potential_path} could not be found or is not a file`)
            return;
        }


    } else if (Array.isArray(potential_path) && potential_path.length > 0 && typeof potential_path[0] === 'string') {
        return potential_path;
    }
    return;
}