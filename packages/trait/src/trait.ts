import type { TraitMetadata } from "../dev/trait-meta";
import { GetTraitKeys, GetTraitMetadata } from "../dev/trait.macro";

export type MethodRecord = Record<string, (...args: any[]) => any>

export type PickMethods<T, K extends keyof T = keyof T> = {
    [P in K as T[P] extends ((...args: any[]) => any) | undefined ? P : never]: T[P];
};

export type OptionalKeysOf<T> = keyof {
    [K in keyof T as Omit<T, K> extends T ? K : never]: T[K];
};;

export type InstanceKeysOf<T> = keyof {
    [K in keyof T as T[K] extends HasThis<T[K]> ? K : never]: T[K];
};

export type RequiredKeysOf<T> = Exclude<keyof T, OptionalKeysOf<T>>;

type SetThis<T, Self> = T extends (this: infer U, ...args: infer A) => infer R ? (this: Prettify<U & Self>, ...args: A) => R : never;
type HasThis<T> = ThisParameterType<T> extends object ? T : never;


export type Self = typeof Self;
export const Self = Symbol.for('Self');

type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type Trait<T extends object, Self extends object = {}, K extends keyof T = keyof T> = Prettify<Required<{
    [P in K as T[P] extends unknown ? P & {} : never]:
    SetThis<T[P], ThisParameterType<T[P]> & Self>
}>>;

export type RequiredMethods<T extends object, Self extends object = {}> = Prettify<Trait<T, Self, Exclude<keyof T, OptionalKeysOf<T>>>> & ThisType<T>;
export type ProvidedMethods<T extends object, Self extends object = {}> = Prettify<Trait<T, Self, OptionalKeysOf<T>>>;

export type StaticMethods<T extends object, Self extends object = {}> = Omit<Trait<T, Self>, InstanceKeysOf<Trait<T, Self>>>;
export type InstanceMethods<T extends object, Self extends object = {}> = Pick<Trait<T, Self>, InstanceKeysOf<Trait<T, Self>>>;

type AddToThis<T1, T2> = {
    [K in keyof T1]: T1[K] extends ((this: infer Self, ...args: infer A) => infer R) ? (this: Prettify<Self & T2>, ...args: A) => R : T1[K];
};


// , Self extends object = {}

export const TraitError = {
    Overwrite(trait_name: string, property_name: string) {
        return new Error(`"${trait_name}" attempted to overwrite a property named ${property_name}. The target type expects this property to be defined at runtime`)
    },
    ImplementatorIncomplete(
        trait_name: string,
        implemented_methods: MethodRecord,
        completed: Set<string>
    ) {

        const names = Array.from(completed).sort((a, b) => a.localeCompare(b));
        const implemented_names = Object.keys(implemented_methods).sort((a, b) => a.localeCompare(b));

        const missing = names.filter(name => implemented_names.includes(name));
        return new Error(`Trait implementor did not implement all the required methods for trait ${trait_name}.\n Missing methods are ${missing.join('\n- ')}`)

    },
    NoTypeFound(trait_name: string[]) {
        return new Error(`found trait(s) "${trait_name.join(', ')}", but no interface that describes ${trait_name.length > 1 ? 'them' : 'it'}.\n You may have a name mismatch (the parser looks for interfaces that have the same name).\n The parser will not look for type aliases (e.g type MyTrait = {})`);
    },
    NoTypeMethods(trait_name: string) {
        return new Error(`found trait "${trait_name}" and it's relevent interface, but no methods were found describing the trait`);
    }
} as const;

export function registerFile() {
    return Symbol.for('Trait');
}

// function addTraitToTarget(
//     target: Record<string, any>,
//     meta: TraitMetadata,
//     trait: MethodRecord,
//     implemented_methods: MethodRecord
// ) {
//     const name = meta.name;
//     const keys = meta.methods.names;
//     console.log(`ADD TRAIT: ${name} keys: ${keys}`);

//     const completed = new Set<string>();

//     for (let i = 0; i < keys.length; i++) {
//         const key = keys[i]!;
//         if (key in target) {
//             throw TraitError.Overwrite(name, key);
//         }
//         if (key in implemented_methods) {
//             const method = implemented_methods[key];
//             Object.defineProperty(target, key, {
//                 value: method
//             });
//         } else {
//             const method = trait[key];
//             Object.defineProperty(target, key, {
//                 value: method
//             });
//         }
//         completed.add(key);
//     }

//     if (completed.size !== keys.length) {
//         throw TraitError.ImplementatorIncomplete(name, implemented_methods, completed);
//     }


// }

export type TraitDefinition<T extends object, Methods = PickMethods<Required<T>>> =
    AddToThis<
        Omit<Methods, RequiredKeysOf<T>>,
        Prettify<Methods>
    >
    & { readonly $trait: string };

export type TraitImplementation<T extends object, Self extends object> = Prettify<RequiredMethods<T, Self> & Partial<ProvidedMethods<T, Self>>>;


type PrettifyThisParam<T> = Prettify<{
    [K in keyof T]: T[K] extends (this: infer S, ...args: infer A) => infer R ? (this: Prettify<S>, ...args: A) => R : T[K];
}>

export function Trait<
    T extends object,
    Self extends object = {},
    Methods = PickMethods<Required<T>>
>(
    trait: TraitDefinition<T, Methods>
) {
    return function <C extends Self>(target: C, methods: TraitImplementation<T, Trait<T> & C>) {
        // register(trait.trait_name);
        // TODO: should not have to use trait.$trait,
        // TODO: instead should be macro call to get trait fully qualified name
        const meta = GetTraitMetadata(trait.$trait);
        // addTraitToTarget(target, meta, trait as MethodRecord, methods);

        return target as C & PrettifyThisParam<Trait<T, C>>;
        /**
         * apply methods to `target`,
         */
    };
};



interface StaticAndInstanceTrait {
    opt?(): string;
    req(): void;

    instance_opt?(this: this): string;
    instance_req(this: this): void;
};

type Def = PickMethods<Required<StaticAndInstanceTrait>>;



interface Simple {
    opt?(): string;
    req(): void;
};

interface SimplePlus {
    opt?(): string;
    req(): void;
    req_inst(this: this): void;
    opt_inst?(this: this): void;
};
const SimplePlus = Trait<SimplePlus>({
    $trait: 'Simple',
    opt() {
        // this.opt()
        // this.req();
        return '';
    },
    opt_inst() {

    }

});

const Simple = Trait<Simple>({
    $trait: 'Simple',
    opt() {
        // this.opt()
        // this.req();
        return '';
    },

});





// const static_instance = Trait<StaticAndInstanceTrait>({
//     req() {},
// })