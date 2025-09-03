import { FixedBitSet } from 'fixed-bit-set';
import { Instance } from "@repo/util/types";

type Constructor<T> = () => Instance<T>;
type Destructor<T> = (instance: Instance<T>) => void;
/** 
 * Performs the copy operation from `src` to `dst`.
 * By default this will enumerate over the source object's keys
 * and do a shallow copy of each property.
 */
export type CopyFn<T> = (src: Instance<T>, dst: Instance<T>) => void;

export type PoolFactory<T> = {
    create: Constructor<T>;
    copy?: CopyFn<T>;
    free?: Destructor<T>;
}

export type PoolOptions = {
    min: number;
} | number;

type PoolObjectInternal<T> = {
    index: number;
    next_free: number | null;
    data: Instance<T>;
}

export type PoolObject<T> = {
    index: number;
    data: Instance<T>;
}

function defaultCopy<T>(src: Instance<T>, dst: Instance<T>) {
    for (const key in src) {
        if (Object.prototype.hasOwnProperty.call(src, key)) {
            dst[key] = src[key];
        }
    }
}

function needsResize(len: number, cap: number) {
    return len >= cap;
}

/**
 * A generic Object Pool over `T`.
 * 
 * This data structure is useful when wanting to avoid garbage collection,
 * or creating/reusing the same objects.
 * 
 * Takes a required object with three methods
 * 1. `create` - factory function
 * 2. `free` - destructor function
 * 3. `copy` - performs similarly to `structuredClone`
 * 
 * Takes optionally an options object with a "min" property of type number, or number
 */
export class Pool<T, Factory extends PoolFactory<T> = PoolFactory<T>> {
    #construct: Constructor<T>;
    #destruct: Destructor<T> | undefined;
    #copy: CopyFn<T>;

    #available_objects: FixedBitSet;

    #free_list_head: number | null;

    #length: number;

    #pool: PoolObjectInternal<T>[];

    constructor(
        { create, free, copy }: Factory,
        options?: PoolOptions
    ) {
        if (typeof options === 'number') {
            options = { min: options };
        } else if (options) {
            options.min = Math.max(options.min, 4);
        } else {
            options = { min: 4 };
        }

        this.#construct = create;
        this.#destruct = free;
        this.#copy = copy ?? defaultCopy;
        this.#pool = Array.from({ length: options.min }, (_, i) => ({ index: i, data: create(), next_free: null }));
        this.#free_list_head = null;
        this.#length = 0;
        this.#available_objects = FixedBitSet.with_capacity(options.min);
    }

    length() {
        return this.#length;
    }

    capacity() {
        return this.#pool.length;
    }

    /** 
     * Contiguity becomes false when freeing objects.
     * If not contiguous, iterating will become slower.
     * 
     * If needing to do lots of iterations, consider calling `makeContigous`.
     * 
     * @returns true if this Pool is contiguous.
     */
    isContiguous() {
        return this.#free_list_head === null;
    }

    /**
     * Gets the next available object in the Pool.
     * 
     * If you want to provide custom data to the pool object before accessing it, consider using [`Pool.insert`].
     */
    acquire(): PoolObject<T> {
        const index = this.#acquire();
        return this.#pool[index]!;
    }

    get(index: number): PoolObject<T> {
        return this.#pool[index];
    }


    /**
     * Frees the object, calling the `free` function provided to the Pool constructor, if one exists.
     * 
     * This method does nothing if `object` is not currently in this Pool.
     */
    free(object: PoolObject<T>) {
        this.freeIndex(object.index, object.data);
    }

    freeIndex(index: number, data: Instance<T>) {
        const available_objects = this.#available_objects;
        if (!available_objects.contains_unchecked(index)) {
            return;
        }

        this.#destruct?.call(null, data);
        // set the next available free index
        this.#pool[index].next_free = this.#free_list_head;
        available_objects.remove(index);
        this.#free_list_head = index;
        this.#length -= 1;

    }

    /**
     * Initializes a new PoolObject at the specified index.
     * 
     * # Safety
     * `initialize` overwrites any PoolObject and it's associated data if one exists at `index`.
     */
    initialize(index: number, data: Instance<T>) {
        this.#pool[index] = { index, data, next_free: this.#free_list_head };
    }

    /**
     * Gets the next available object in the Pool.
     * 
     * This method does the same as `copy(pool.get(), data)`.
     * 
     * @example
     * pool.getCopied(new Bullet(0, 0, 5)) // same as below
     * 
     * const object = pool.get();
     * pool.copy(object, new Bullet(0, 0, 5))
     */
    insert(data: Instance<T>): PoolObject<T> {
        const index = this.#acquire();
        return this.copy(this.#pool[index]!, data);
    }

    /**
     * Uses the `copy` factory function provided at Pool creation
     * to replace [`PoolObject.data`] with `data`.
     * 
     * This method keeps the same [`PoolObject.data`] reference.
     */
    replace(index: number, data: Instance<T>) {
        this.#copy(data, this.#pool[index].data);
    }

    copy(src: PoolObject<T>, dst: Instance<T>): PoolObject<T> {
        this.#copy(dst, src.data);
        return src;
    }

    /**
     * Makes the Pool contiguous, speeding up operations.
     */
    makeContiguous() {
        let head = this.#free_list_head;
        while (!head !== null) {

        }
    }

    /**
     * sets this pool length to `0`, effectively de-initializing all acquired objects.
     * 
     * Further operations such as `.has()` will return false on previously acquired objects.
     */
    clear() {
        this.#length = 0;
        this.#available_objects.clear();
    }

    fill() {
        const capacity = this.#pool.length;
        this.#available_objects.insert_range(0, capacity);
        this.#length = capacity;
    }

    fillWith(fn: CopyFn<T>) {

    }


    iter() {
        return {
            pool: this.#pool,
            len: this.#pool.length,
            cursor: this.#free_list_head ?? 0,
            next(): IteratorResult<Instance<T>> {
                const cursor = this.cursor;
                if (cursor >= this.len) {
                    return { done: true, value: undefined };
                }
                const el = this.pool[cursor]!;
                this.cursor = el.next_free ?? cursor + 1;
                return { done: false, value: el.data };
            }
        }
    }

    /**
     * `acquire` retrieves the next available object index, and performs any resizing if necessary.
     */
    #acquire() {
        const len = this.#length,
            head = this.#free_list_head,
            pool = this.#pool;

        if (needsResize(len, pool.length)) {
            this.#reserve(pool.length);
        }

        this.#length += 1;

        if (head === null) {
            // allocate at the end of the pool
            this.#available_objects.put_unchecked(len);
            return len;
        } else {
            // there are still empty slots before the end of the pool,
            // so use them 
            this.#available_objects.put_unchecked(head);
            this.#free_list_head = pool[head].next_free;
            return head;
        }
    }

    /**
     * Adds `additional` elements to the Pool.
     * 
     * # Safety
     * The caller ensures that `free_index` is properly set after this operation (for example, if `free_index === pool.length - 1`, then it should be set to `free_index + 1`)
     */
    #reserve(additional: number) {
        const pool = this.#pool,
            create = this.#construct,
            prev_last_index = pool.length - 1;

        pool.length += additional;

        for (let i = prev_last_index; i < pool.length; i++) {
            pool[i] = { index: i, data: create(), next_free: this.#free_list_head };
        }
    }

}