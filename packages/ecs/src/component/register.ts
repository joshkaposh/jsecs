import { iter } from "joshkaposh-iterator";
import { entry, type UUID } from "@repo/util";
import { debugAssert } from "@repo/util/assert";
import type { Component, Resource } from './define';
import type { Components } from './components';
import { ComponentDescriptor } from './descriptor';
import { enforceNoRequiredComponentsRecursion, RequiredComponents } from "./required";
import type { ComponentIds } from "./ids";

type ComponentId = number;


// class RequiredComponentsRegistrator {
//     constructor(self: any, required_components: RequiredComponents) { }
// }

/**
 * A `Components` wrapper that enables additional features, like registration.
 */
export class ComponentsRegistrator {
    #components: Components;
    #ids: ComponentIds;
    #recursion_check_stack: ComponentId[];

    constructor(components: Components, ids: ComponentIds) {
        this.#components = components;
        this.#ids = ids;
        this.#recursion_check_stack = [];
    }

    get components() {
        return this.#components;
    }

    get ids() {
        return this.#ids;
    }

    asQueued() {
        return new ComponentsQueuedRegistrator(this.#components, this.#ids);
    }

    anyQueued() {
        return false;
    }

    applyQueuedRegistrations() {
        const self = this;
        if (!self.anyQueued()) {
            return
        }

        const getRegistrator = (type: 'components' | 'resources') => {
            const components = self.#components.queued[type];
            const result = components.keys().next();
            if (result.done) {
                return
            }
            const registrator = components.get(result.value)!;
            components.delete(result.value);
            return registrator;
        }


        let registrator;
        const c = 'components';
        // components
        while ((registrator = getRegistrator(c))) {
            registrator.register(self);
        }


        // resources

        // dynamic
        const queued = this.#components.queued;
        if (queued.dynamic_registrations.length > 0) {
            const registrations = queued.dynamic_registrations.splice(0, queued.dynamic_registrations.length);
            for (let i = 0; i < registrations.length; i++) {
                registrations[i]!.register(this);
            }
        }

        // const queued = this.#components.queued;
        // let type_id: IteratorResult<UUID>;
        // // components
        // while (!(type_id = queued.components.keys().next()).done) {
        //     const registrator = queued.components.get(type_id.value)!;
        //     queued.components.delete(type_id.value);
        //     registrator.register(this);

        // }

        // // resources
        // while (!(type_id = queued.resources.keys().next()).done) {
        //     const registrator = queued.resources.get(type_id.value)!;
        //     queued.resources.delete(type_id.value);
        //     registrator.register(this);
        // }

        // // dynamic
        // if (queued.dynamic_registrations.length > 0) {
        //     const registrations = queued.dynamic_registrations;
        //     queued.dynamic_registrations = [];
        //     for (let i = 0; i < registrations.length; i++) {
        //         registrations[i]!.register(this);
        //     }
        // }
    }


    __registerComponent(component: Component) {
        return this.__registerComponentChecked(component);
    }

    __registerComponentChecked(component: Component) {
        const type_id = component.type_id;
        const existing_id = this.#components.getValidId(type_id);

        if (existing_id != null) {
            enforceNoRequiredComponentsRecursion(this.#components, this.#recursion_check_stack);
            return existing_id;
        }

        const registrator = this.#components.queued.components.get(type_id);
        this.#components.queued.components.delete(type_id);

        if (registrator) {
            return registrator.register(this)
        }

        const id = this.ids.next();

        this.__registerComponentUnchecked(component, id);

        return id;
    }

    __registerComponentUnchecked(type: Component, id: ComponentId) {

        this.#components.__registerComponentInner(id, ComponentDescriptor.newComponent(type));
        const type_id = type.type_id;

        // @ts-expect-error
        const indices = this.#components.indices;
        debugAssert(!indices.has(type_id));
        indices.set(type_id, id);
        this.#recursion_check_stack.push(id);

        const required_components = new RequiredComponents();
        // const required_components_registrator = new RequiredComponentsRegistrator(this, required_components);

        this.#components.__registerRequiredBy(id, required_components);
        this.#recursion_check_stack.pop();

        const info = this.#components
            // @ts-expect-error
            .components[id]!;
        debugAssert(info != null);

        info.hooks.updateFromComponent(type);
        // @ts-expect-error
        info.required_components = required_components;
    }


    __registerResource(resource: Resource) {
        return this.__registerResourceWith(resource.type_id, () => ComponentDescriptor.newResource(resource));
    }

    __registerResourceWith(type_id: UUID, descriptor: () => ComponentDescriptor) {
        const existing_id = this.#components.getValidResourceId(type_id);

        if (existing_id != null) {
            return existing_id
        }

        const resources = this.#components.queued.resources;
        const registrator = resources.get(type_id);
        resources.delete(type_id);

        if (registrator) {
            return registrator.register(this);
        }

        const id = this.ids.next();
        this.#components.__registerResourceUnchecked(type_id, id, descriptor())
        return id;
    }

    __registerWithDescriptor(descriptor: ComponentDescriptor) {
        const id = this.#ids.next();
        this.#components.__registerComponentInner(id, descriptor);
        return id;
    }

}

export class QueuedRegistration {
    registrator: (registrator: ComponentsRegistrator, id: ComponentId, descriptor: ComponentDescriptor) => void;
    id: ComponentId;
    descriptor: ComponentDescriptor;

    constructor(
        registrator: (registrator: ComponentsRegistrator, id: ComponentId, descriptor: ComponentDescriptor) => void,
        id: ComponentId,
        descriptor: ComponentDescriptor

    ) {
        this.registrator = registrator;
        this.id = id;
        this.descriptor = descriptor;
    }

    register(registrator: ComponentsRegistrator) {
        this.registrator(registrator, this.id, this.descriptor);
        return this.id;
    }
}

export class QueuedComponents {
    components: Map<UUID, QueuedRegistration>;
    resources: Map<UUID, QueuedRegistration>;
    dynamic_registrations: QueuedRegistration[]
    constructor() {
        this.components = new Map();
        this.resources = new Map();
        this.dynamic_registrations = [];
    }

    [Symbol.toStringTag]() {
        const components = iter(this.components.entries()).map(([type_id, queued]) => [type_id, queued.id]).collect();
        const resources = iter(this.resources.entries()).map(([type_id, queued]) => [type_id, queued.id]).collect();
        const dynamic_registrations = iter(this.dynamic_registrations).map((queued) => queued.id).collect();

        return `components: ${components}, resources: ${resources}, dynamic_registrations: ${dynamic_registrations}`

    }
}

export class ComponentsQueuedRegistrator {
    #components: Components;
    #ids: ComponentIds;

    constructor(components: Components, ids: ComponentIds) {
        this.#components = components;
        this.#ids = ids;
    }

    /**
     * Queues this function to run as a component registrator if the given
     * type is not already queued as a component.
     *
     * # Safety
     *
     * The [`TypeId`] must not already be registered as a component.
     */
    private registerArbitraryComponent(type_id: UUID, descriptor: ComponentDescriptor, func: (registrator: ComponentsRegistrator, id: ComponentId, descriptor: ComponentDescriptor) => void) {
        const writer = this
            .#components
            .queued
            .components

        return entry(writer, type_id, () => new QueuedRegistration(func, this.#ids.next(), descriptor)).id;
    }

    private registerArbitraryResource(type_id: UUID, descriptor: ComponentDescriptor, func: (registrator: ComponentsRegistrator, id: ComponentId, descriptor: ComponentDescriptor) => void) {
        const writer = this
            .#components
            .queued
            .resources

        return entry(writer, type_id, () => new QueuedRegistration(func, this.#ids.next(), descriptor)).id;
    }


    private registerArbitraryDynamic(descriptor: ComponentDescriptor, func: (registrator: ComponentsRegistrator, id: ComponentId, descriptor: ComponentDescriptor) => void) {
        const writer = this
            .#components
            .queued
            .dynamic_registrations;

        const id = this.#ids.next();

        writer.push(new QueuedRegistration(func, id, descriptor));

        return id;
    }

    queueRegisterComponent(component: Component) {
        return this.#components.componentId(component) ?? this.registerArbitraryComponent(component.type_id, ComponentDescriptor.newComponent(component), (registrator, id) => registrator.__registerComponentUnchecked(component, id))
    }

    queueRegisterComponentWithDescriptor(descriptor: ComponentDescriptor) {
        return this.registerArbitraryDynamic(descriptor, (registrator, id, descriptor) => registrator.components.__registerComponentInner(id, descriptor));
    }

    queueRegisterResource(resource: Resource) {
        const type_id = resource.type_id;
        return this.#components.getResourceId(type_id) ?? this.registerArbitraryResource(type_id, ComponentDescriptor.newResource(resource), (registrator, id, descriptor) => registrator.components.__registerResourceUnchecked(type_id, id, descriptor))
    }

    queueRegisterResourceWithDescriptor(descriptor: ComponentDescriptor) {
        return this.registerArbitraryDynamic(descriptor, (registrator, id, descriptor) => registrator.components.__registerComponentInner(id, descriptor));
    }


    /**
     * Queues this function to run as a component registrator
     */
    forceRegisterArbitraryComponent(type_id: UUID, descriptor: ComponentDescriptor, func: (registrator: ComponentsRegistrator, component_id: ComponentId, descriptor: ComponentDescriptor) => void) {
        const id = this.#ids.next();
        this.#components
            .queued
            .components
            .set(type_id, new QueuedRegistration(func, id, descriptor))
    }

    /**
     * Queues this function to run as a resource registrator
     */
    forceRegisterArbitraryResource(type_id: UUID, descriptor: ComponentDescriptor, func: (registrator: ComponentsRegistrator, component_id: ComponentId, descriptor: ComponentDescriptor) => void) {
        const id = this.#ids.next();
        this.#components
            .queued
            .resources
            .set(type_id, new QueuedRegistration(func, id, descriptor))
    }


    /**
     * Queues this function to run as a dynamic registrator
     */
    forceRegisterArbitraryDynamic(descriptor: ComponentDescriptor, func: (registrator: ComponentsRegistrator, component_id: ComponentId, descriptor: ComponentDescriptor) => void) {
        this.#components
            .queued
            .dynamic_registrations
            .push(new QueuedRegistration(func, this.#ids.next(), descriptor));
    }

}