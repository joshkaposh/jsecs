import { unit } from '@repo/util'
import type { Component, ComponentId } from "./component/define";
import type { Entity } from "./entity";
import { SparseSet } from "./storage";
import type { ComponentIdFor } from './component';
import type { World } from './world';

// @ts-ignore
type Events<T> = any;

export type ComponentHook = unknown;

export const ADD = 0;
export const INSERT = 1;
export const REPLACE = 2;
export const REMOVE = 3;
export const DESPAWN = 4;
export const Add = {};
export const Insert = {};
export const Replace = {};
export const Remove = {};
export const Despawn = {};

export class ComponentHooks {
    private on_add: ComponentHook | undefined;
    private on_insert: ComponentHook | undefined;
    private on_replace: ComponentHook | undefined;
    private on_remove: ComponentHook | undefined;
    private on_despawn: ComponentHook | undefined;

    updateFromComponent(type: Component) {
        let hook;
        if (hook = type.onAdd()) {
            this.onAdd(hook);
        }

        if (hook = type.onInsert()) {
            this.onInsert(hook);
        }

        if (hook = type.onReplace()) {
            this.onReplace(hook);
        }

        if (hook = type.onRemove()) {
            this.onRemove(hook);
        }

        if (hook = type.onDespawn()) {
            this.onDespawn(hook);
        }

        return this;
    }

    /**
    * Register a [`ComponentHook`] that will be run when this component is added to an entity.
    * An `on_add` hook will always run before `on_insert` hooks. Spawning an entity counts as
    * adding all of its components.
    *
    * # Throws
    *
    * @throws Will throw an Error if the component already has an `on_add` hook
     */
    onAdd(hook: ComponentHook) {
        const err = this.tryOnAdd(hook);
        if (err) {
            throw new Error('Component already has an onAdd hook');
        }
    }

    /**
    * Register a [`ComponentHook`] that will be run when this component is added (with `.insert`)
    * or replaced.
    *
    * An `on_insert` hook always runs after any `on_add` hooks (if the entity didn't already have the component).
    *
    * # Warning
    *
    * The hook won't run if the component is already present and is only mutated, such as in a system via a query.
    * As a result, this needs to be combined with immutable components to serve as a mechanism for reliably updating indexes and other caches.
    *
    * # Throws
    *
    * @throws if the component already has an `on_insert` hook
     */
    onInsert(hook: ComponentHook) {
        const err = this.tryOnInsert(hook);
        if (err) {
            throw new Error('Component already has an onInsert hook');
        }
    }



    /**
     * Register a [`ComponentHook`] that will be run when this component is about to be dropped,
     * such as being replaced (with `.insert`) or removed.
     *
     * If this component is inserted onto an entity that already has it, this hook will run before the value is replaced,
     * allowing access to the previous data just before it is dropped.
     * This hook does *not* run if the entity did not already have this component.
     *
     * An `on_replace` hook always runs before any `on_remove` hooks (if the component is being removed from the entity).
     *
     * # Warning
     *
     * The hook won't run if the component is already present and is only mutated, such as in a system via a query.
     * As a result, this needs to be combined with immutable components to serve as a mechanism for reliably updating indexes and other caches.
     *
     * # Trhwos
     *
     * @throws if the component already has an `on_replace` hook
     */
    onReplace(hook: ComponentHook) {
        const err = this.tryOnReplace(hook);
        if (err) {
            throw new Error('Component already has an onReplace hook');
        }
    }


    /**
     * Register a [`ComponentHook`] that will be run when this component is removed from an entity.
     * Despawning an entity counts as removing all of its components.
     *
     * # Throws
     *
     * @throws if the component already has an `on_remove` hook
     */
    onRemove(hook: ComponentHook) {
        const err = this.tryOnRemove(hook);
        if (err) {
            throw new Error('Component already has an onRemove hook');
        }
    }


    /**
     * Register a [`ComponentHook`] that will be run for each component on an entity when it is despawned.
     *
     * # Panics
     *
     * @throws if the component already has an `on_despawn` hook
     */
    onDespawn(hook: ComponentHook) {
        const err = this.tryOnDespawn(hook);
        if (err) {
            throw new Error('Component already has an onDespawn hook');
        }
    }

    /**
     * Attempt to register a [`ComponentHook`] that will be run when this component is added to an entity.
     *
     * This is a fallible version of [`Self.onAdd`].
     *
     * @returns `undefined` if the component already has an `onAdd` hook.
     */
    tryOnAdd(hook: ComponentHook) {
        if (this.on_add) {
            return
        }

        this.on_add = hook;
        return this;
    }

    /**
     * Attempt to register a [`ComponentHook`] that will be run when this component is added (with `.insert`)
     *
     * This is a fallible version of [`Self.onInsert`].
     *
     * @returns `undefined` if the component already has an `onInsert` hook.
     */
    tryOnInsert(hook: ComponentHook) {
        if (this.on_insert) {
            return
        }

        this.on_insert = hook;
        return this;
    }

    /**
     * Attempt to register a [`ComponentHook`] that will be run when this component is replaced (with `.insert`) or removed.
     *
     * This is a fallible version of [`Self.onReplace`].
     *
     * @returns `undefined` if the component already has an `onReplace` hook.
     */
    tryOnReplace(hook: ComponentHook) {
        if (this.on_replace) {
            return
        }

        this.on_replace = hook;
        return this;
    }

    /**
     * Attempt to register a [`ComponentHook`] that will be run when this component is removed from an entity.
     *
     * This is a fallible version of [`Self.onRemove`].
     *
     * @returns `undefined` if the component already has an `onRemove` hook.
     */
    tryOnRemove(hook: ComponentHook) {
        if (this.on_remove) {
            return
        }

        this.on_remove = hook;
        return this;
    }


    /**
     * Attempt to register a [`ComponentHook`] that will be run for each component on an entity when it is despawned.
     *
     * This is a fallible version of [`Self.onDespawn`].
     *
     * @returns `undefined` if the component already has an `onDespawn` hook.
     */
    tryOnDespawn(hook: ComponentHook) {
        if (this.on_despawn) {
            return
        }

        this.on_despawn = hook;
        return this;
    }
}

export class RemovedComponentEntity {
    readonly entity: Entity;
    constructor(entity: Entity) {
        this.entity = entity;
    }
}

// @ts-ignore
class EventCursor<T> {
    static default<T>() {
        return new EventCursor<T>();
    }
}

export class RemovedComponentReader<T extends Component> {

    // @ts-ignore
    #reader: EventCursor<RemovedComponentEntity>;
    // @ts-ignore
    #ty: T;
    constructor(type: T, reader = EventCursor.default<RemovedComponentEntity>()) {
        this.#reader = reader;
        this.#ty = type;
    }
}

/**
 * Stores the [`RemovedComponents`] event buffers for all types of component in a given [`World`].
 */
export class RemovedComponentEvents {
    #event_sets: SparseSet<Events<RemovedComponentEntity>>;
    constructor() {
        this.#event_sets = new SparseSet();
    }

    static init_state() {
        return unit
    }

    update() {
        const events = this.#event_sets.inner_values();
        for (let i = 0; i < events.length; i++) {
            events[i].update();
        }
    }

    iter() {
        return this.#event_sets.iter();
    }

    get(component_id: ComponentId) {
        return this.#event_sets.get(component_id);
    }

    write(component_id: ComponentId, entity: Entity) {
        this.#event_sets
            // @ts-expect-error
            .getOrSetWith(component_id, () => Events.default)
            .write(new RemovedComponentEntity(entity));
    }
}

// @ts-ignore
type Local<T> = any;

export class RemovedComponents<T extends Component> {
    #component_id: ComponentIdFor;
    #reader: Local<RemovedComponentReader<T>>;
    #events_sets: RemovedComponentEvents;

    constructor(id: ComponentIdFor, world: World) {
        this.#component_id = id;
        this.#events_sets = world.removedComponents(id.v) as any
        this.#events_sets = new RemovedComponentEvents();
    }

    reader() {
        return this.#reader;
    }

    events() {
        return this.#events_sets.get(this.#component_id.v);
    }

    readerWithEvents() {
        const events = this.#events_sets.get(this.#component_id.v);
        if (events) {
            return [this.#reader, events] as const;
        }
    }

    read() {
        const tuple = this.readerWithEvents();
        if (tuple) {
            return tuple[0]
                .read(tuple[1])
                .flatten()
                .map((something: any) => something.entity)
        }
    }

    readWithId() {
        const tuple = this.readerWithEvents();
        if (tuple) {
            tuple[0]
                .readWithId(tuple[1])
                .flatten()
                .map(mapIdEvents)
        }
    }

    get length() {
        const events = this.events();
        return events ? this.#reader.len(events) : 0
    }

    get isEmpty() {
        const events = this.events();
        return events ? this.#reader.isEmpty(events) : true;
    }

    clear() {
        const tuple = this.readerWithEvents();
        if (tuple) {
            tuple[0].clear(tuple[1]);
        }
    }
}

// @ts-ignore
type EventId<T> = any;
function mapIdEvents([entity, id]: [RemovedComponentEntity, EventId<RemovedComponentEntity>]) {
    return [entity.entity, id];
}

