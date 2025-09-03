type Indexable = { [key: string]: any }
export type Paths = [string, string | string[]][]

export const canRecurse = (property: unknown) => typeof property === 'object' && !Array.isArray(property)
export const canEdit = (key: string) => key !== 'id' && key !== 'type' && key !== 'engine_type'

const normalizeKey = (str: string) => {
    const split = str.split('/')
    if (split[0] === 'root') {
        split.shift();
    }
    return split;
}


function recurse(
    filter: (key: string) => boolean,
    obj: Indexable,
    output: Map<string, (string[]) | string>,
    parentKey = 'root') {
    for (let key in obj) {
        if (filter(key)) {
            const replacement = `${parentKey}/${key}`
            if (obj[key] && typeof obj[key] === 'object') {
                recurse(filter, obj[key], output, replacement)
            } else {
                const path = normalizeKey(replacement);
                const last = path[path.length - 1]!;
                path.pop();
                if (path.length === 0) output.set(last, last)
                else output.set(path.join('/'), path)
            }
        }

    }
}

export function buildPaths(object: object, viewable: ((key: string) => boolean) | boolean | null | undefined): Paths {

    const filter = typeof viewable !== 'function' ? () => Boolean(viewable) : viewable
    const output_map = new Map();

    recurse(filter, object, output_map);

    return Array.from(output_map);
}

function traverse(path: string[], callback: (item: string) => void) {
    for (let i = 0; i < path.length; i++) {
        callback(path[i]!)
    }
}

export function walkPath(root: Indexable, path: string[]) {
    let temp = root;
    traverse(path, (p) => {
        temp = temp[p]

    })
    return temp;
}

function walkPaths(previousRoot: Indexable, currentRoot: Indexable, paths: Paths) {
    // ! keep is broken
    let prev_temp: Indexable, curr_temp: Indexable;

    for (let i = 0; i < paths.length; i++) {
        const [_, path] = paths[i]!;
        prev_temp = previousRoot;
        curr_temp = currentRoot;

        if (typeof path === 'string') {
            curr_temp[path] = prev_temp[path];

        } else {
            traverse(path, (p) => {
                prev_temp = prev_temp[p]
                curr_temp = curr_temp[p]
            })
            const keys = Object.keys(curr_temp);
            for (let j = 0; j < keys.length; j++) {
                const k = keys[j]!;
                curr_temp[k] = prev_temp[k]
            }

        }

    }
}

// export function newBuilder<T extends string>(type: string) {
//     return new ObjectBuilder<T>(type)
// }

// export function editBuilder<T extends new (...args: any[]) => any>(type: T) {
//     return new ObjectBuilder(type)
// }

// export function keepRootValues(b: ObjectBuilder, paths: ReturnType<typeof buildPaths>) {
//     return new ObjectBuilder(b.type, { previousRoot: b.root, paths })
// }



export default class ObjectBuilder<Name extends string, Type extends Record<string, any>> {
    #type!: Name;
    #root!: Type;

    get type() {
        return this.#type
    }

    get root() {
        return this.#root;
    }

    constructor(type: Name | Type, options?: {
        previousRoot: Indexable,
        paths: ReturnType<typeof buildPaths>
    }) {
        this.#setDefaultConfig(type, options);
    }

    updateProperty(path: string | string[], key: string, value: any) {
        if (path === key || path === '') {
            // @ts-expect-error
            this.#root[key] = value;
            return;
        }

        let temp = this.#root
        for (let i = 0; i < path.length; i++) {
            temp = temp[path[i]!]
        }
        // @ts-expect-error
        temp[key] = value
    }

    #setDefaultConfig(type: Name | Type, options?: {
        previousRoot: Indexable,
        paths: ReturnType<typeof buildPaths>
    }) {
        if (typeof type === 'string') {
            // const [_, engine_type, config, create] = editor_objects[type]
            // this.#root = create(config() as any)
            this.#type = type;
            // this.#obj_type = engine_type

            if (options) {
                console.log('---ObjectBuilder Options---', options);

                //* should copy over values
                walkPaths(options.previousRoot, this.#root, options.paths)
            }
            return
        }

        this.#root = type;
        // this.#type = type.type as ClassKeys;
        // this.#obj_type = type.engine_type as ObjectTypes
    }
}
