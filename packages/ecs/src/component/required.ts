import { entry, splitLast } from "@repo/util";
import type { Components } from "./components";
import type { Component, ComponentId } from "./define";
import type { Entity } from "../entity/entity";
import { BundleInfo } from "../bundle/info";
import type { SparseSets, Table, TableRow } from "../storage";
import { ErrorExt } from "joshkaposh-option";
import type { ComponentsRegistrator } from ".";

type RequiredCtor = (table: Table, sparse_sets: SparseSets, change_tick: Tick, table_row: TableRow, entity: Entity) => void;

type Tick = number;

export class RequiredComponentConstructor {
    ctor: RequiredCtor;
    constructor(
        ctor: RequiredCtor
    ) {
        this.ctor = ctor;
    }

    static new<C extends Component>(component_id: ComponentId, constructor: C) {
        const ctor: RequiredCtor = (table, sparse_sets, change_tick, table_row, entity) => {
            const ptr = new constructor();
            BundleInfo.__initializeRequiredComponent(table, sparse_sets, change_tick, table_row, entity, component_id, constructor.storage_type, ptr)
        }
        return new RequiredComponentConstructor(ctor);
    }

    clone() {
        return new RequiredComponentConstructor(this.ctor);
    }
}

export class RequiredComponent {
    ctor: RequiredComponentConstructor;

    constructor(ctor: RequiredComponentConstructor) {
        this.ctor = ctor;
    }

    clone() {
        return new RequiredComponent(this.ctor.clone());
    }
}

export class RequiredComponents {
    __direct: Map<ComponentId, RequiredComponent>;
    __all: Map<ComponentId, RequiredComponent>;

    constructor(direct = new Map<ComponentId, RequiredComponent>(), all = new Map<ComponentId, RequiredComponent>()) {
        this.__direct = direct;
        this.__all = all;
    }

    /**
     * empties this `RequiredComponents` and returns a new Reference with the copied `direct` and `all` maps.
     */
    __take() {
        const direct = new Map(this.__direct.entries());
        const all = new Map(this.__all.entries());
        this.__all.clear();
        this.__direct.clear();
        return new RequiredComponents(direct, all);
    }

    __register(component: Component, components: ComponentsRegistrator, constructor: Component) {
        const id = components.__registerComponent(component);
        this.registerById(id, components.components, constructor);
    }

    registerById(component_id: ComponentId, components: Components, constructor: Component) {
        const ctor = () => RequiredComponentConstructor.new(component_id, constructor);
        this.registerDynamicWith(component_id, components, ctor);
    }

    registerDynamicWith(
        component_id: ComponentId,
        components: Components,
        constructor: () => RequiredComponentConstructor
    ) {

        if (this.__direct.has(component_id)) {
            throw new Error(`Error while registering required component ${component_id}: already directly required`)
        }

        const required_component = new RequiredComponent(constructor());
        this.__direct.set(component_id, required_component);

        RequiredComponents.registerInheritedRequiredComponentsUnchecked(this.__all, component_id, required_component, components);
    }

    rebuildInheritedRequiredComponents(components: Components) {
        this.__all.clear();

        for (const [required_id, required_component] of this.__direct.entries()) {
            RequiredComponents.registerInheritedRequiredComponentsUnchecked(this.__all, required_id, required_component.clone(), components);
        }
    }

    static registerInheritedRequiredComponentsUnchecked(all: Map<ComponentId, RequiredComponent>, required_id: ComponentId, required_component: RequiredComponent, components: Components) {
        const info = components.getInfo(required_id)!;
        if (!all.has(required_id)) {
            for (const [inherited_id, inherited_required] of info.required_components.__all) {
                entry(all, inherited_id, () => inherited_required.clone());
            }
        }
        all.set(required_id, required_component);
    }

    iterIds() {
        return this.__all.keys();
    }

}

export const RequiredComponentsError = {
    DuplicateRegistration(id1: ComponentId, id2: ComponentId) {
        return new ErrorExt([id1, id2], `Component ${id1} already directly requires component ${id2}`)
    },
    CyclicRequirement(id1: ComponentId, id2: ComponentId) {
        return new ErrorExt([id1, id2], `Cyclic requirement found: the requiree component ${id1} is required by the required component ${id2}`)
    },
    ArchetypeExists(id1: ComponentId) {
        return new ErrorExt(id1, `An archetype with the component ${id1} that requires other components already exists`)
    }
} as const;


export function enforceNoRequiredComponentsRecursion(components: Components, recursion_check_stack: ComponentId[]) {
    const tuple = splitLast(recursion_check_stack);
    if (tuple) {
        const [requiree, check] = tuple;
        const idx = check.indexOf(requiree);

        if (idx != -1) {
            const direct_recursion = idx === check.length - 1;
            if (direct_recursion) {
                throw new Error(`Recursive required components detected: ${recursion_check_stack.map(id => components.getName(id)!).join(' -> ')}\nhelp: ${direct_recursion ? `remove require(${components.getName(requiree)!})` : 'If this is intentional, consider merging the components'}`);
            }
        }
    }
}