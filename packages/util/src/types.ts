
export type Primitive = null | undefined | string | boolean | number | symbol | bigint;

export type Anything = Primitive | Record<PropertyKey, any>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type Some<T> = NonNullable<T>;

export type AnyRecord = Record<PropertyKey, any>;


/**
 * Exludes any type that is not inferable as `number` (e.g number or \`${number}\`)
 * 
 * @example
 * //  0 | 1 | 5
 * type Solution = PickNumber<object | string | `${number}-${string}` | 0 | 1 | `${5}`>
 */
export type PickNumber<T> =
    T extends number ? T :
    T extends `${infer Inner extends number}` ? Inner :
    never;

export type Index<T> = T extends Array<any> ? number : keyof T;

export type IndexNumber<T> = T extends Array<any> ? number : PickNumber<keyof T>;

export type NumberRecord<T> = {
    [K in keyof T as PickNumber<K>]: T[K];
};

/**
 * Converts an object or record into an array
 */
export type ToArray<T, K extends keyof T = keyof T> = Array<T[K]>;



export type Instance<T> = T extends new (...args: any[]) => any ? InstanceType<T> : T;

export type Default<T = any> = T extends Primitive | { new(): any } | (() => any) ? T : never;

export type Clone<T> = T extends Primitive ? T : {
    clone(): Instance<T>;
}
// export type Clone<T extends Primitive | (new (...args: any[]) => any)> = T extends Primitive ? T : T & { clone(): InstanceType<T> };

export type NoReadonly<T> = {
    -readonly [K in keyof T]: T[K];
};

/**
 * Recursively makes `T` mutable,
 * i.e. removes the `readonly` property modifier from each key, recursively.
 */
export type Mut<T> = {
    -readonly [K in keyof T]:
    // Is it a primitive? Then return it
    T[K] extends Primitive ? T[K]
    // Is it an array of items? Then make the array mutable and the item as well
    : T[K] extends Array<infer A> ? Array<Mut<A>>
    // It is some other object, make it mutable as well
    : Mut<T[K]>;
};

type LoosenPrimitive<T> = T extends string ? string :
    T extends number | bigint ? number :
    T extends boolean ? boolean :
    T extends null | undefined ? T : never;


export type Combine<T1, T2> = Omit<T1, keyof T2> & T2;

/**
 * Loosens primitive values.
 * 
 * By default this does nothing.
 * @example
 * 
 * const constant = {
 *  prop: 1,
 *  prop2: true,
 *  prop3: 'hello world',
 * } as const;
 * 
 * // remove readonly modifier before loosening 'prop' and 'prop2'
 * const loosened:Loosen<NoReadonly<typeof constant>, 'prop' | 'prop2'> = constant;
 * 
 * loosened.prop = 5; // no type error
 * loosened.prop2 = 'not a boolean' // type error, string is not assignable to boolean
 */
export type Loosen<T, K extends keyof T = never> = T extends Primitive ? LoosenPrimitive<T> :
    Prettify<Omit<T, K> & { [P in K]: Loosen<T[P]> }>;

/**
 * Recursively makes `T` immutable,
 *  i.e. adds the `readonly` property modifier to each key, recursively.
 */
export type Immut<T> = Readonly<{
    [K in keyof T]:
    // Is it a primitive? Then make it readonly
    T[K] extends Primitive ? Readonly<T[K]>
    // Is it an array of items? Then make the array readonly and the item as well
    : T[K] extends Array<infer A> ? Readonly<Array<Immut<A>>>
    // It is some other object, make it readonly as well
    : Immut<T[K]>;
}>;


export type * from './symbol-polyfill';
export type * from './class';
export type * from './descriptor';
export type * from './mixin';
export type * from './type-id';
export type * from './predicate';
