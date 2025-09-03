/**
 * useful for when wanting to return nothing but asserting the return type,
 * or when assigning a variable
 */
// @ts-expect-error
export function cast<T>(): T { }

export * from './feature';
export * from './fn-string';
export * from './project';
// export * from './manipulate-source';