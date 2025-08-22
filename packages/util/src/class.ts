
/**
 * Any class, including abstract classes.
 * 
 * @paramType Type - The class type
 * @paramType Args - The arguments of the constructor
 */
export type Class<Type = any, Args extends any[] = any[]> = ConcreteClass<Type, Args> | AbstractClass<Type, Args>;

export type ConcreteClass<Type = any, Args extends any[] = any[]> = new (...args: Args) => Type;
export type NoArgsClass<Type = any> = new () => Type;

/**
 * Any abstract class.
 */
export type AbstractClass<Type = any, Args extends any[] = any[]> = abstract new (...args: Args) => Type;


export function isClassConstructor<T extends Class>(value: unknown): value is T {
    return typeof value === 'function' && value.prototype !== undefined;
}

export function isClassInstance<T extends Class>(ty: unknown): ty is InstanceType<T> {
    return ty?.constructor?.name !== 'Function' && ty?.constructor?.name !== 'Object'
}
