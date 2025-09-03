import { type ClassDeclarationStructure, type MethodDeclarationStructure, type PropertyDeclarationStructure, type WriterFunction } from 'ts-morph';

/**
 * @module
 * 
 * exposes a set of functions and types to
 * apply mixins at build time.
 * 
 * API:
 * 
 * const MyTrait = define({
 *      properties: {
 *              
 *          }
 *      });
 * 
 */

// interface NodeDefinition {
//     name: string;
//     isStatic: boolean;
//     isAbstract: boolean;
//     isReadonly: boolean;
// }

// interface PropertyDefinition<Type = unknown, Initializer = any> extends NodeDefinition {
//     type: Type;
//     initializer?: Initializer;
// };

// interface MethodDefinition extends NodeDefinition {

// };



type BaseTrait = Pick<ClassDeclarationStructure, "methods" | "properties" | 'name' | 'typeParameters' | 'implements'>;

type Prop = PropertyDeclarationStructure;
type Method = MethodDeclarationStructure;

declare const base: BaseTrait;
declare const prop: Prop;

type RequiredPropertyDescriptor = NonNullRecord<Pick<Prop, 'type' | 'initializer'>>;

type RequiredMethodDescriptor = NonNullRecord<
    Pick<Method, 'returnType' | 'name'>
>;

type Prettify<T> = { [K in keyof T]: T[K] } & {}

type NonNullRecord<T> = Required<{ [K in keyof T]: T[K] & {} }>;

type JoinOverwrite<A, B> = Omit<A, keyof B> & B;

type PropertyDefinition = Prettify<JoinOverwrite<
    Pick<Prop, 'docs' | 'initializer' | 'type' | 'scope' | 'kind' | 'isStatic' | 'isReadonly'>,
    RequiredPropertyDescriptor
>>;

type MethodDefinition = Prettify<JoinOverwrite<
    Pick<Method, "docs" | 'typeParameters' | 'statements' | 'scope' | 'returnType' | 'overloads' | 'parameters' | 'isAsync' | 'isGenerator' | 'kind' | 'isStatic' | 'name'>,
    RequiredMethodDescriptor
>>;

type TraitDefinition = {
    name: string;
    properties?: Record<PropertyKey, any>;
    methods?: Record<PropertyKey, any>;
    // extends?: TraitDefinition[];
};

type LookupFn<T = any> = (name: T) => boolean;
type ObjectNameCache = {
    readonly name: string;
    readonly instance: LookupFn<string>;
    readonly static: LookupFn<string>;
};

type ApplyTrait<Trait> = {
    apply<Target extends abstract new (...args: any[]) => any>(target: Target): Trait & Target;
};

function try_apply_trait(cache: ObjectNameCache, trait: TraitDefinition, trait_name: string, message: string) {
    const types = (trait.properties ?? []).concat(trait.methods);
    for (let i = 0; i < types.length; i++) {
        const type = types[i]!;
        const name = type.name;
        const is_static = type.isStatic;

        if (cache.instance(name)) {
            return new Error(`${message} ${name} is required in \`Trait<${trait_name}>\`'s instance, but was applied on \`${cache.name}\`, which already has a property or method with the same name.`)
        }

        if (is_static && cache.static(name)) {
            return new Error(`Static ${message} ${name} is required in \`Trait<${trait_name}>\`, but was applied on \`${cache.name}\`, which already has a property or method with the same name.`)
        }

    }

}

function apply_trait(cache: ObjectNameCache, trait: TraitDefinition) {
    // const traitp = Object.keys(trait.properties ?? {});
    // const traitm = Object.keys(trait.methods ?? {});

    // let err = try_apply_trait(cache, traitp, trait.name, 'Property');
    // if (err) throw err;
    // err = try_apply_trait(cache, traitm, trait.name, 'Method');
    // if (err) throw err;

}