import { swap } from "./array";

export type TypedArray<T extends ArrayBufferLike = ArrayBufferLike> =
    Uint8Array<T>
    | Uint16Array<T>
    | Uint32Array<T>
    | Int8Array<T>
    | Int16Array<T>
    | Int32Array<T>
    // | Float16Array
    | Float32Array<T>
    | Float64Array<T>;

export function pop(array: TypedArray<ArrayBuffer>): number | undefined {
    if (array.length === 0) {
        return
    }
    const elt = array[array.length - 1];
    array.buffer.resize(array.byteLength - array.BYTES_PER_ELEMENT);
    return elt;
}


export function swapPop(array: TypedArray<ArrayBuffer>, i: number) {
    const last_index = array.length - 1;
    if (array.length > 0 && i !== last_index) {
        swap(array, i, last_index);
    }

    return pop(array);
}

export function swapPopUnchecked(array: TypedArray<ArrayBuffer>, i: number) {
    const last_index = array.length - 1;
    swap(array, i, last_index);
    return pop(array);
}
