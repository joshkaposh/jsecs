import { Trait, type Self } from "../src/trait";
import { boolean, normal_function, object_literal, anon_fn_assign } from './imported-types';


// export interface ExampleTraitInterface {
//     providedMethod?(): boolean;
//     requiredMethod(): boolean;

//     providedGenericMethod?<T>(type: T): boolean;
//     requiredGenericMethod<T extends { himom: string }>(type: T): boolean;

//     providedInstanceMethod?(this: Self): void;
//     requiredinstanceMethod(this: Self): void;
// };

// export const ExampleTraitInterface = Trait<ExampleTraitInterface>({
//     $trait: 'ExampleTraitInterface',
//     providedGenericMethod(type) {
//         return true
//     },
//     providedMethod() {
//         return false;
//     },
//     providedInstanceMethod() {

//     },
// });

export interface StaticAndInstanceTrait {
    opt?(): string;
    req(): void;

    instance_opt?(this: this): string;
    instance_req(this: this): void;
};


export interface SimpleTrait {
    opt?(): string;
    req(): void;
};

export const SimpleTrait = Trait<SimpleTrait>({
    $trait: 'SimpleTrait',
    opt() {
        this.opt()
        this.req();
        return '';
    },

});

export interface SimplePlus {
    opt?(): string;
    req(): void;
    req_inst(this: this): void;
    opt_inst?(this: this): void;
};

const outer_object_literal = {};
const outer_primitive = true;

export const SimplePlus = Trait<SimplePlus>({
    $trait: 'Simple',
    opt() {
        console.log(outer_object_literal, outer_primitive);
        return '';
    },
    opt_inst() {

    }
});

export interface SimpleGenericTrait<T extends { himom: string } = { himom: string }> {
    opt?(this: T): void;
    req(this: T): void;
};

export const SimpleGenericTrait = Trait<SimpleGenericTrait, { himom: string }>({
    $trait: 'SimpleGenericTrait',
    // req() {
    // },
    opt() {
        this.himom;
        this.opt();
        this.req();
    },
});

// const usingSimple = SimpleGenericTrait({
//     himom: ''
// }, {
//     req() {
//         this.opt();
//         this.req();
//         this.himom
//     },
// });

// usingSimple.himom;
// usingSimple.opt();
// usingSimple.req();


// export interface ReferencesOtherFileTrait {
//     normal(): void;
//     anon_fn_assign(): void;
//     object_literal(): void;
// }

// export const ReferencesOtherFileTrait = Trait<ReferencesOtherFileTrait>({
//     $trait: 'ReferencesOtherFileTrait',
// });