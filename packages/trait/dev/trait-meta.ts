import { bit } from 'joshkaposh-option'

export type Flags = number;
export const FLAGS = 0 as number;
export const INSTANCE = 1 as number;
export const STATIC = 2 as number;
export const PROVIDED = 3 as number;
export const REQUIRED = 4 as number;

export const Flags = {
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
    methods: {
        names: string[];
        all: Record<string, Flags>;
        provided: Record<string, string>;
        required: Record<string, string>;
        static: Record<string, string>;
        instance: Record<string, string>;
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

    entries() {
        return this.#files.entries();
        // return Object.fromEntries(this.#files.entries());
    }

    setProvided(file_path: string, trait_name: string, methods: Record<string, string>) {
        // const trait = this.get(trait_name);
        const trait = this.getTrait(file_path, trait_name);
        if (!trait) {
            return;
        }

        const provided = trait.methods.provided;
        const required = trait.methods.required;

        for (const key in methods) {
            if (key in provided) {
                provided[key] = methods[key]!;
            }
            // } else {
            // required[key] = methods[key]!;
            // }
        }

        // provided.push({name: })
        // const all = trait.methods.all;
        // for (let i = 0; i < all.length; i++) {
        //     const m = all[i]!;
        //     if (m.name) {
        //     }
        // }

    }
}

