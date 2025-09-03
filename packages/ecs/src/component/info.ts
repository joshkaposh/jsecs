import { bit } from "joshkaposh-option";
import type { Resource } from "./define";
import { RequiredComponents } from "./required";
import { ArchetypeFlags } from "../archetype";
import { ComponentHooks } from "../lifecycle";
import type { ComponentDescriptor } from "./descriptor";

type ComponentId = number;

export type ResourceComponentInfo = ComponentInfo & { type: Resource }

export class ComponentInfo {
    #id: ComponentId;
    #descriptor: ComponentDescriptor;
    #required_components: RequiredComponents;
    required_by: Set<ComponentId>
    #hooks: ComponentHooks;

    constructor(id: ComponentId, descriptor: ComponentDescriptor) {
        this.#id = id;
        this.#descriptor = descriptor;
        this.#required_components = new RequiredComponents();
        this.required_by = new Set();
        this.#hooks = new ComponentHooks();
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#descriptor.name;
    }

    get mutable() {
        return this.#descriptor.mutable;
    }

    get type_id() {
        return this.#descriptor.type_id;
    }

    get storage_type() {
        return this.#descriptor.storage_type;
    }

    get clone_behavior() {
        return this.#descriptor.clone_behavior;
    }

    get hooks() {
        return this.#hooks;
    }

    get descriptor() {
        return this.#descriptor;
    }

    private set required_components(required_components) {
        this.#required_components = required_components;
    }
    get required_components() {
        return this.#required_components;
    }

    updateArchetypeFlags(flags: ArchetypeFlags) {
        // @ts-expect-error
        const { on_add, on_insert, on_replace, on_remove, on_despawn } = this.#hooks;
        if (on_add) {
            flags = bit.set(flags, ArchetypeFlags.ON_ADD_HOOK);
        }

        if (on_insert) {
            flags = bit.set(flags, ArchetypeFlags.ON_INSERT_HOOK);
        }

        if (on_replace) {
            flags = bit.set(flags, ArchetypeFlags.ON_REPLACE_HOOK);
        }

        if (on_remove) {
            flags = bit.set(flags, ArchetypeFlags.ON_REMOVE_HOOK);
        }

        if (on_despawn) {
            flags = bit.set(flags, ArchetypeFlags.ON_DESPAWN_HOOK);
        }

        return flags;

    }

    [Symbol.toPrimitive]() {
        return `ComponentDescriptor {
            name: ${this.name},
            storage_type: ${this.storage_type},
            type_id: ${this.type_id},
            mutable: ${this.mutable},
            clone_behavior: ${this.clone_behavior}
        }`
    }

    [Symbol.toStringTag]() {
        return this[Symbol.toPrimitive]();
    }

}