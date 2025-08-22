import { expect } from 'bun:test';

export function assert(is_true: unknown, message?: string) {
    expect(is_true, message).toBeTrue();
}

export function isFunction(value: unknown, message?: string): asserts value is Function {
    message ??= `typeof value is "${typeof value}", but must be "function"`;
    expect(value, message).toBeFunction();
}

export function throws(value: unknown, message?: string) {
    isFunction(value);
    expect(value(), message).toThrow();
}

function getError(fn: Function) {
    try {
        fn()
    } catch (error) {
        if (error instanceof Error) {
            return error;
        }
    }
}

export function returnsError<T extends Error = Error>(value: unknown, error?: T, message?: string) {
    isFunction(value);
    const err = getError(value);
    expect(err, message).toBeInstanceOf(error ?? Error);

}