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
