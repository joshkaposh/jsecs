import type { AnyRecord } from "./types";

export const STATIC = 'static';
export const INSTANCE = 'instance';

export type MixinTarget = { new(...args: any[]): object };

export type TraitObject<T = any> = ((target: T) => AnyRecord) | {
    withSymbols?: boolean;
    static?: AnyRecord;
    instance?: AnyRecord;
};

export type Trait<T extends TraitObject = AnyRecord> = T;
export type TraitFn<Traits extends TraitObject = TraitObject, Target extends AnyRecord = AnyRecord> = (target: Target) => Traits;

/** 
 * Normalizes the mixin type.
 * 
 * `Mixin`s can either be any record (`Record<PropertyKey, any>`)
 * or a unary function that return a `Mixin` record,
 * or a class
 */
type Normalize<T2> =
    T2 extends (...args: any[]) => infer R ? R extends AnyRecord ? R : never :
    T2;

type Merge<T1, T2 extends AnyRecord> = Omit<T1, keyof T2> & Pick<T2, keyof T1> & Omit<T2, keyof T1>;

export type Mixin<Base, M extends readonly AnyRecord[]> = M extends [
    infer T2 extends AnyRecord,
    ...infer Rest extends readonly AnyRecord[]
] ? Mixin<Merge<Base, Normalize<T2>>, Rest> : Base;


export type DeriveFn<T extends object = object, P extends object = object> = (target: T) => Mixin<T, [P]>;

export function addMixin(base: any, derive: any, withSymbols = false) {
    console.log('addMixin: base = ', base);
    console.log('addMixin: derived = ', derive);

    const keys: PropertyKey[] = Object.getOwnPropertyNames(derive);

    if (withSymbols) {
        keys.push(...Object.getOwnPropertySymbols(derive));
    }

    for (let i = 0; i < keys.length; i++) {
        const name = keys[i]!;
        Object.defineProperty(
            base,
            name,
            Object.getOwnPropertyDescriptor(derive, name) || Object.create(null)
        );
    }
}

export function derive<Base extends MixinTarget, const M extends TraitObject<Base>[]>(base: Base, ...mixins: M): Base & Mixin<Base, M> {
    for (let i = 0; i < mixins.length; i++) {
        const derive = mixins[i];
        if (typeof derive === 'function') {
            derive(base as any);
        } else if (derive != null && typeof derive === 'object') {
            if (STATIC in derive) {
                addMixin(base, derive[STATIC]);
            }
            if (INSTANCE in derive) {
                addMixin(base, derive[INSTANCE]!);
            }
        }
    }
    return base as any;
}

export function bind(_originalMethod: Function, context: ClassMethodDecoratorContext) {
    const name = context.name;
    if (context.private) {
        if (context.private) {
            throw new Error(`'bound' cannot decorate private properties like ${name as string}.`);
        }
        context.addInitializer(function (this: any) {
            this[name] = this[name].bind(this);
        })
    }
}