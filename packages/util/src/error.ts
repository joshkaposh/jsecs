export function isError(value: unknown) {
    return (typeof Error.isError === 'function' && Error.isError(value)) || value instanceof Error;
}

/**
 * calls the provided function and returns it's value, or an `Error` if the function threw.
 * 
 * In other words, this function converts an exception into a runtime value.
 * 
 * @returns `T` or `Error` if `fn` threw an `Error`
 */
export function result<const T>(fn: () => T): T | Error {
    try {
        return fn();
    } catch (error) {
        if ((typeof Error.isError === 'function' && Error.isError(error)) || error instanceof Error) {
            return error;
        }
    }
    return undefined as unknown as T;
}
