import { clamp } from "./math";

export type Compare<T = unknown> = (a: T, b: T) => -1 | 0 | 1;

/**
 * this function will only modify the array if the passed `len` is less than `array.length`.
 * 
 * @example
 * const array = new Array(100);
 * truncate(array,200);
 * console.log(array.length) // 100
 * truncate(array,50);
 * console.log(array.length) // 50
 */
export function truncate(array: any[], len: number) {
    if (len < array.length) {
        array.length = len;
    }
}

/**
 Only keeps elements of an array that meet the condition specified in a callback function.

 This is similar to `Array.prototype.filter`,with the only difference being it modifies the array it was passed instead of creating a new instance.
 * @example
 * const array = [1, 2, 3, 4];
 * retain(array, el => el % 2 === 0);
 * console.log(array) // [2, 4];
 */
export function retain<T>(data: T[] | Set<T>, keep: (element: T) => boolean) {
    if (Array.isArray(data)) {

        for (let i = data.length - 1; i >= 0; i--) {
            if (keep(data[i]!)) {
                continue
            }
            data.splice(i, 1);
        }
    } else if (data instanceof Set) {
        for (const v of data.values()) {
            if (keep(v)) {
                continue
            }
            data.delete(v);
        }
    }

}

export function splitAt<T>(array: T[], index: number): [T[], T[]] | undefined {
    if (array.length > 0) {
        return [array.slice(0, index), array.slice(index, array.length)]
    }
}

export function splitFirst<T>(array: T[]): [T, T[]] | undefined {
    if (array.length > 0) {
        return [array[0]!, array.slice(1, array.length)]
    }
}

export function splitLast<T>(array: T[]): [T, T[]] | undefined {
    if (array.length > 0) {
        return [array[array.length - 1]!, array.slice(0, array.length - 1)]
    }
}


export function is_arraylike<T>(obj?: { length?: number }): obj is ArrayLike<T> {
    const ty = typeof obj
    return ty === 'string' || (ty !== 'function' && ty === 'object' && typeof obj?.length === 'number');
}

export function oob(index: number, length: number) {
    return index >= 0 && index < length;
}

//! used by typed-array, declared here to avoid circular dependency.

type TypedArray<T extends ArrayBufferLike = ArrayBufferLike> =
    Uint8Array<T>
    | Uint16Array<T>
    | Uint32Array<T>
    | Int8Array<T>
    | Int16Array<T>
    | Int32Array<T>
    // | Float16Array
    | Float32Array<T>
    | Float64Array<T>;

export function swap(array: TypedArray | any[], a: number, b: number): void;
export function swap(array: TypedArray | any[] | Record<PropertyKey, any>, a: PropertyKey, b: PropertyKey) {
    const temp = array[b as number];
    array[b as number] = array[a as number];
    array[a as number] = temp;
}

/**
 * swaps an element at the specified index with the last element in the array before popping it.
 * 
 * This function will clamp `index` between `0` and `array.length -1`.
 * 
 * If you know the index you're accessing is not the last element and in the array bounds,
 * consider using `swapPopUnchecked`.
 */
export function swapPop<T>(array: T[], index: number) {
    const end = array.length - 1;
    index = clamp(index, 0, end);
    swap(array, index, end);
    return array.pop();
}

/**
 * swaps an element at the specified index with the last element in the array before popping it.
 * 
 * **SAFETY**
 * 
 * This function does no bounds checking and simply does the swap() operation followed by a pop().
 * 
 * If you know the index you're accessing is not the last element and in the array bounds,
 * consider using `swapPopUnchecked`.
 */
export function swapPopUnchecked<T>(array: T[], index: number) {
    swap(array, index, array.length - 1);
    return array.pop();
}

export function extend<T, V>(target: T[] | Set<T> | Map<T, V>, src: Iterable<T>, default_value?: T | null) {
    if (Array.isArray(target)) {
        extendArray(target, src, default_value);
    } else if (target instanceof Set) {
        extendSet(target, src, default_value);
    } else if (target instanceof Map) {
        extendMap(target, src as Iterable<[T, V]>);
    } else {
        console.warn('Cannot use a generic extend as it only works when target is on an Array, Map, or Set. Try making your own implementation for extending your data structure.')
    }
}

export function extendArray<T>(target: T[], src: Iterable<T>, default_value?: T | null) {
    if (default_value != null) {
        target.push(...Array.from(src, () => default_value));
    } else {
        target.push(...src)
    }
}


export function extendSet<T>(target: Set<T>, src: Iterable<T>, default_value?: T | null) {
    for (const v of src) {
        target.add(default_value ?? v);
    }
}

export function extendMap<K, V>(target: Map<K, V>, src: Iterable<[K, V]>) {
    for (const [k, v] of src) {
        target.set(k, v);
    }
}

export function capacity(len: number): number {
    if (len === 0) {
        return 0;
    }
    if (len < 4) {
        return 4
    }

    const cap = 1 << 31 - Math.clz32(len);
    if (cap <= len) {
        return cap << 1;
    }

    return cap
}