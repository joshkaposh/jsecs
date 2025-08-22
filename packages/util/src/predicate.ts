export type Predicate<T = unknown> = (value: T) => boolean;

export function isObject(value: unknown): value is object {
    if (value === null || value === undefined) {
        return false;
    }
    const ty = typeof value;
    return ty === 'object' || ty === 'function';
}

export function isClassDecoratorContext<T extends abstract new (...args: any[]) => any>(value: unknown): value is ClassDecoratorContext<T> {
    return isObject(value) && value['kind' as keyof typeof value] === 'class';
}

// export function isBrowser() {

//     if (isObject(window)) {
        
//     }
// }