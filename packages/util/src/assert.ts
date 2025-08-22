export class AssertError extends Error {
    constructor(msg?: string, options?: ErrorOptions) {
        super(msg, options)
        console.error(this.stack);
    }
}

class NotImplementedError extends Error {
    constructor(message: string) {
        super(`Not implemented: ${message}`)
    }
}

export function TODO<T>(message: string, ..._args: any[]): T {
    throw new NotImplementedError(message);
}

export function assert(is_true: boolean): void
export function assert(is_true: boolean, message: string): void;
export function assert(is_true: boolean, message: string, a: unknown, b: unknown): void;
export function assert(is_true: boolean, message?: string, a?: unknown, b?: unknown) {
    const base = arguments.length === 4 ? `Assert failed on ${a} === ${b}` : 'Assert Failed';
    if (!is_true) {
        const msg = message == null ? `${base} ${message}` : base
        throw new AssertError(msg)
    }
}

export function debugAssert(is_true: boolean, msg?: string) {
    // if (import.meta.env) {

    // }
    // if (is_true) {
    //     let message = 'Assertion failed'
    //     if (msg) {
    //         message += `: ${msg}`;
    //     }
    //     throw new Error(message += msg ?? '')
    // }
    if (!is_true) {
        console.error('Debug Assert: ', msg);
    }
}
