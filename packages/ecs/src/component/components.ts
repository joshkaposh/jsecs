import { extend, retain, type UUID } from "@repo/util";
import { debugAssert } from "@repo/util/assert";
import type { Component, ComponentId, Resource } from "./define";
import { RequiredComponents, RequiredComponentsError } from "./required";
import { QueuedComponents } from "./register";
import { ComponentInfo } from "./info";
import type { ComponentDescriptor } from "./descriptor";
import type { World } from "../world";
import { iter } from "joshkaposh-iterator";

type SystemMeta = any;

export class Components {
    #components: ComponentInfo[];
    #indices: Map<UUID, ComponentId>;
    #resource_indices: Map<UUID, ComponentId>;
    #queued: QueuedComponents;

    constructor(
        components: ComponentInfo[] = [],
        indices: Map<UUID, ComponentId> = new Map(),
        resource_indices: Map<UUID, ComponentId> = new Map(),
    ) {
        this.#components = components;
        this.#indices = indices;
        this.#resource_indices = resource_indices;
        this.#queued = new QueuedComponents();
    }

    private get components() {
        return this.#components;
    }

    private get indices() {
        return this.#indices;
    }

    static init_state() { }

    static get_param(_state: void, _system_meta: SystemMeta, world: World) {
        return world.components;
    }

    get queued() {
        return this.#queued;
    }

    len() {
        return this.numQueued() + this.numRegistered();
    }

    /**
    * @returns true if there are no components registered with this instance.
    */
    isEmpty() {
        return this.len() === 0;
    }

    /**
    * @returns the number of components registered with this instance.
    */
    numQueued() {
        const queued = this.#queued;
        return queued.components.size + queued.dynamic_registrations.length + queued.resources.size;
    }

    /**
    * @returns true if there are any components registered with this instance.
    */
    anyQueued() {
        return this.numQueued() > 0;
    }

    numRegistered() {
        return this.#components.length;
    }

    anyRegistered() {
        return this.#components.length > 0;
    }

    getInfo(id: ComponentId): ComponentInfo | undefined {
        return this.#components[id];
    }

    getDescriptor(id: ComponentId) {
        const info = this.#components[id];
        if (info) {
            return info.descriptor;
        } else {

            function find(queued: { id: number }) {
                return queued.id === id;
            }

            const queued = this.#queued;

            for (const value of queued.components.values()) {
                if (find(value)) {
                    return value.descriptor;
                }
            }

            for (const value of queued.resources.values()) {
                if (find(value)) {
                    return value.descriptor;
                }
            }

            for (const value of queued.dynamic_registrations.values()) {
                if (find(value)) {
                    return value.descriptor;
                }
            }
        }

    }

    getName(id: ComponentId) {
        const info = this.#components[id];
        if (info) {
            return info.name;
        } else {
            const queued = this.#queued;

            function find(queued: { id: number }) {
                return queued.id === id;
            }

            for (const value of queued.components.values()) {
                const found = find(value);
                if (found) {
                    return value.descriptor.name;
                }
            }

            for (const value of queued.resources.values()) {
                const found = find(value);
                if (found) {
                    return value.descriptor.name;
                }
            }

            for (const value of queued.dynamic_registrations.values()) {
                const found = find(value);
                if (found) {
                    return value.descriptor.name;
                }
            }
        }
    }

    getHooks(id: ComponentId) {
        return this.#components[id]?.hooks;
    }

    getRequiredComponents(id: ComponentId) {
        return this.#components[id]?.required_components;
    }

    getRequiredBy(id: ComponentId) {
        return this.#components[id]?.required_by;
    }

    /**
     * @returns true if the [`ComponentId`] is fully registered and valid.
     * Ids may be invalid if they are still queued to be registered.
     * Those ids are still correct, but they are not usable in every context yet.
     */
    isIdValid(id: ComponentId) {
        return this.#components[id] != null;
    }

    getValidId(type_id: UUID) {
        return this.#indices.get(type_id);
    }

    validComponentId(component: Component) {
        return this.getValidId(component.type_id);
    }

    getValidResourceId(type_id: UUID) {
        return this.#resource_indices.get(type_id);
    }

    validResourceId(resource: Resource) {
        return this.getValidResourceId(resource.type_id);
    }

    getId(type_id: UUID) {
        return this.#indices.get(type_id) ?? this.#queued.components.get(type_id)?.id;
    }

    getResourceId(type_id: UUID) {
        return this.#resource_indices.get(type_id) ?? this.#queued.resources.get(type_id)?.id;
    }

    componentId(type: Component) {
        return this.getId(type.type_id);
    }

    resourceId(type: Resource) {
        return this.getResourceId(type.type_id);
    }


    iterRegistered() {
        return this.#components;
    }

    [Symbol.iterator]() {
        return this.#components[Symbol.iterator]();
    }

    __registerComponentInner(id: ComponentId, descriptor: ComponentDescriptor) {
        this.#components[id] = new ComponentInfo(id, descriptor);
    }

    __registerRequiredBy(requiree: ComponentId, required_components: RequiredComponents) {
        for (const required of required_components.__all.keys()) {
            const required_by = this.getRequiredBy(required);
            debugAssert(required_by != null);
            required_by!.add(requiree);
        }
    }

    __registerRequiredComponents<R extends Component>(requiree: ComponentId, required: ComponentId, constructor: R) {
        const required_required_components = this.getRequiredComponents(required);
        debugAssert(required_required_components != null);

        if (required_required_components!.__all.has(requiree)) {
            return RequiredComponentsError.CyclicRequirement(requiree, required);
        }

        let required_components = this.getRequiredComponents(requiree)!;
        debugAssert(required_components != null);

        if (required_components.__direct.has(required)) {
            return RequiredComponentsError.DuplicateRegistration(requiree, required);
        }

        const old_required_count = required_components.__all.size;

        this.__requiredComponentsScope(requiree,
            (self, required_components) => required_components.registerById(required, self as any, constructor)
        );

        required_components = this.getRequiredComponents(requiree)!;
        debugAssert(required_components != null);

        // const new_required_components = required_components.__all.slice(old_required_count);
        const values_iter = required_components.__all.keys();
        for (let i = 0; i < old_required_count; i++) {
            values_iter.next();
        }

        const new_required_components = Array.from(values_iter);

        const requiree_required_by = this.getRequiredBy(requiree)!;
        debugAssert(requiree_required_by != null);

        const new_requiree_components = iter([requiree])
            .chain(iter(requiree_required_by.values()) as any)
            .collect(Set) as Set<number>;

        const values = new_requiree_components.values();
        values.next();

        for (const indirect_requiree of values) {
            this.__requiredComponentsScope(indirect_requiree, (self, required_components) => required_components.rebuildInheritedRequiredComponents(self as any));
        }

        for (const indirect_required of new_required_components) {
            const required_by = this.getRequiredBy(indirect_required)!;
            debugAssert(required_by != null);

            retain(required_by, id => !new_requiree_components.has(id));
            extend(required_by, new_requiree_components);
        }

    }

    __requiredComponentsScope<R>(component_id: ComponentId, f: (self: ThisType<Components>, required_components: RequiredComponents) => R) {

        let required_components = this.getRequiredComponents(component_id);
        if (required_components) {
            required_components = required_components.__take()
        }
        // f(this, )


        setTimeout(() => {
            const required_components = this.getRequiredComponents(component_id);
            debugAssert(required_components!.__direct.size === 0);
            debugAssert(required_components!.__all.size === 0);

            // required_components?.take(this.)
            // required_components!.take()
        }, 0);


    }

    __registerResourceUnchecked(type_id: UUID, component_id: ComponentId, descriptor: ComponentDescriptor) {
        this.__registerComponentInner(component_id, descriptor);
        const prev = this.#resource_indices.has(type_id);
        this.#resource_indices.set(type_id, component_id);
        debugAssert(prev == null);
    }

}
