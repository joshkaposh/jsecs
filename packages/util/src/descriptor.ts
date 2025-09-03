import type { AnyRecord } from "./types";

export interface PropertyDescriptor<T = any> {
    configurable: boolean;
    enumerable?: boolean;
    value: T;
    writable?: boolean;
    get?(): T;
    set?(v: T): void;
};


export type IntoPropertyDescriptors<Properties, K extends keyof Properties = keyof Properties> =
    { readonly [P in K]: PropertyDescriptor<Properties[P]> };


export function desc<T>(value: T, configurable: boolean, writable: boolean): PropertyDescriptor<T> {
    return {
        value,
        configurable: configurable,
        writable: writable,
        enumerable: true
    }
}

export function descriptorMap<Obj extends Record<PropertyKey, any>, const K extends readonly (keyof Obj)[]>(
    properties: Obj,
    keys: K = Object.getOwnPropertyNames(properties) as unknown as K,
    writable = false
) {
    return keys.reduce((acc, x) => {
        acc[x] = desc(properties[x]!, false, writable);
        return acc;
    }, {} as PropertyDescriptorMap);

}

/**
 * calls `Object.defineProperty` for each property in `properties` on the specified target.
 * 
 * This will only properties not found
 */
export function defineProperties(target: Record<PropertyKey, any>, properties: PropertyDescriptorMap) {
    const entries = Object.entries(properties);
    for (let i = 0, len = entries.length; i < len; i++) {
        const [key, value] = entries[i]!
        if (Object.hasOwn(target, key)) {
            continue
        }
        Object.defineProperty(target, key, value);
    }
}


type PropertyConfigOptions<Config extends AnyRecord = AnyRecord> = boolean | {
    /** useful if wanting to provide default configuration options */
    default?(type: Config): Required<Config>;
    /** which keys of the config object to use (By default uses `Object.getOwnPropertyNames()`) */
    keys?: readonly (keyof Config)[] | (keyof Config)[];
    writable?: boolean;
}

/**
 * returns a closure that applies the specified config to the target object.
 * 
 * @example
 * 
 * const object = {};
 * 
 * applyProperties({
 *  id: 5
 * })(object);
 * 
 * object.id = 6; //throws a TypeError (cannot assign to readonly property)
 * 
 * 
 * applyProperties({
 *  mutableId: 5
 * }, {writable: true})(object);
 */
export function applyProperties<Config extends Partial<AnyRecord>>(
    config: NoInfer<Config>,
    options?: PropertyConfigOptions<Config>
) {
    if (options == null) {
        options = {
            keys: Object.getOwnPropertyNames(config),
            writable: false
        };
    } else if (typeof options === 'boolean') {
        options = {
            writable: options
        }
    }

    if (options.default) {
        config = options.default(config);
    }

    const { keys, writable } = options;

    return <T extends AnyRecord>(target: T) => {
        defineProperties(target, descriptorMap(
            config,
            keys,
            writable
        ));
        return target;
    }
}

/**
 * Copies properties from `src` into `dst`.
 * 
 * This will override any properties found in `dst`.
 */
export function mergeObjects<T extends AnyRecord, Src extends T = T, const Dst extends T = Src>(dst: Dst, src: Src): Dst {
    for (const key in src) {
        dst[key] = src[key];
    }
    return dst;
}