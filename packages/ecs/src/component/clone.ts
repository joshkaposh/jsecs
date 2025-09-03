import type { Component } from "./define";

type SourceComponent = any;
type ComponentCloneCtx = any;

export type ComponentCloneFn = (source_component: SourceComponent, component_clone_context: ComponentCloneCtx) => void;

export type ComponentCloneBehaviorType = 0 | 1 | ComponentCloneFn;
export class ComponentCloneBehavior {
    #type: 0 | 1 | ComponentCloneFn;
    constructor(type: 0 | 1 | ComponentCloneFn = 0) {
        this.#type = type;
    }

    static Default = new ComponentCloneBehavior(0);
    static Ignore = new ComponentCloneBehavior(1);

    static Custom(fn: ComponentCloneFn) {
        return new ComponentCloneBehavior(fn);
    }

    static clone<T extends Component>(type: T): ComponentCloneBehavior {
        return ComponentCloneBehavior.Custom(component_clone_via_clone.bind(type));
    }

    static global_default_fn() {
        return component_clone_ignore;
    }

    /**
     * Resolves the [`ComponentCloneBehaviour`] to a [`ComponentCloneFn`]. If [`ComponentCloneBehaviour.Default`]  is specified,
     * the given `default` funciton will be used.
     */
    resolve(Default: ComponentCloneFn): ComponentCloneFn {
        const ty = this.#type;
        return ty === 0 ? Default : ty === 1 ? component_clone_ignore : ty;
    }
}

function component_clone_via_clone<T extends Component>(this: ThisType<T>, source: SourceComponent, context: ComponentCloneCtx): any {
}

function component_clone_ignore(): any { }