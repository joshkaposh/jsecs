import { Trait, type ProvidedMethods, type Self } from "../src/trait";

export { Trait };

export interface ExampleTraitInterface {
    providedMethod?(): boolean;
    requiredMethod(): boolean;

    providedGenericMethod?<T>(type: T): boolean;
    requiredGenericMethod<T extends { himom: string }>(type: T): boolean;

    providedInstanceMethod?(this: Self): void;
    requiredinstanceMethod(this: Self): void;
};

export const ExampleTraitInterface = Trait<ExampleTraitInterface>({
    $trait: 'ExampleTraitInterface',
    providedGenericMethod(type) {
        return true
    },
    providedMethod() {
        return false;
    },
    providedInstanceMethod() {

    },
});

export interface SimpleTrait {
    opt?(): void;
    req(): void;
};

export const SimpleTrait = Trait<SimpleTrait>({
    $trait: 'SimpleTrait',
    opt() {
        this.opt()
        this.req();
    },
});


export interface SimpleGenericTrait<T extends { himom: string }> {
    opt?(this: T): void;
    req(this: T): void;
};

export const SimpleGenericTrait = Trait<SimpleGenericTrait<{ himom: string }>>({
    $trait: 'SimpleGenericTrait',
    opt() {
        this.himom;
        this.opt();
        this.req();
    },
});