import { Trait, type Self } from "../src/trait";

export interface ExampleTraitInterface {
    providedMethod?(): boolean;
    requiredMethod(): boolean;

    providedGenericMethod?<T>(type: T): boolean;
    requiredGenericMethod<T extends { himom: string }>(type: T): boolean;

    providedInstanceMethod(this: Self): void;
    requiredinstanceMethod(this: Self): void;
};

export const ExampleTraitInterface = Trait<ExampleTraitInterface>({
    providedGenericMethod(type) {
        return true
    },
    providedMethod() {
        return false;
    },
})
