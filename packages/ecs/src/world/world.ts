import { type UUID } from "@repo/util";
import { Archetypes } from "../archetype";
import { Component, ComponentDescriptor, ComponentIds, Components, ComponentsRegistrator, type Tick, type ComponentId, type Resource, isNewerThan } from "../component";
import { Entities } from "../entity";
import { Storages } from "../storage";
import { WorldId } from "./identifier";
import { DeferredWorld } from "./deferred-world";

type Bundles = any;
type Observers = any;
type RemovedComponents = any;
type RawCommandQueue = any;

export class World {
    readonly id!: WorldId;
    readonly entities!: Entities;
    readonly components!: Components;
    readonly component_ids!: ComponentIds;
    readonly archetypes!: Archetypes;
    readonly storages!: Storages;
    readonly bundles!: Bundles;
    readonly observers!: Observers;
    readonly removed_components!: RemovedComponents;
    changeTick!: Tick;
    lastCheckTick!: Tick;
    readonly command_queue!: RawCommandQueue;

    private constructor(
        id: WorldId,
        entities: Entities,
        components: Components,
        component_ids: ComponentIds,
        archetypes: Archetypes,
        storages: Storages,
        bundles: Bundles,
        observers: Observers,
        removed_components: RemovedComponents,
        changeTick: Tick,
        lastCheckTick: Tick,
        command_queue: RawCommandQueue
    ) {

        this.id = id;
        this.entities = entities;
        this.components = components;
        this.component_ids = component_ids;
        this.archetypes = archetypes;
        this.storages = storages;
        this.bundles = bundles;
        this.observers = observers;
        this.removed_components = removed_components;
        this.changeTick = changeTick;
        this.lastCheckTick = lastCheckTick;
        this.command_queue = command_queue;
    }

    static new() {
        const id = WorldId();
        if (id == null) {
            throw new Error('More `World`s have been created than is supported');
        }
        const world = new World(
            id,
            new Entities(),
            new Components(),
            new ComponentIds(),
            new Archetypes(),
            new Storages(),
            null,
            null,
            null,
            0,
            0,
            null
        );
        world.__bootstrap();
        return world;
    }

    intoDeferred() {
        return new DeferredWorld(this);
    }

    addObserver() { }

    addSchedule() { }

    allowAmbiguousComponent() { }

    allowAmbiguousResource() { }

    checkChangeTicks() { }

    clearAll() { }

    clearEntities() { }

    clearResources() { }

    clearTrackers() { }

    commands() { }

    componentsRegistrator() {
        return new ComponentsRegistrator(this.components, this.component_ids);
    }

    componentId(component: Component) {
        return this.components.componentId(component);
    }

    hasResource(resource: Resource) {
        const component_id = this.getResourceId(resource.type_id);
        if (component_id == null) {
            return false;
        }

        return Boolean(this.storages.resources.get(component_id)?.isPresent);
    }

    hasResourceById(component_id: ComponentId) {
        return Boolean(this.storages.resources.get(component_id)?.isPresent);
    }

    despawn() { }

    entitiesAndCommands() { }

    entity() { }

    entityMut() { }

    flush() { }

    get() { }

    getById() { }

    getEntity() { }

    getEntityMut() { }

    getMut() { }

    getMutById() { }

    getRequiredComponents() { }

    getRequiredComponentsById() { }

    getResource() { }

    getResourceId(type_id: UUID) {
        return this.components.getResourceId(type_id);
    }

    getResourceById() { }

    getResourceMut() { }

    getResourceMutById() { }

    getResourceOrInit() { }

    getResourceRef() { }

    incrementChangeTick() { }

    initResource() { }

    insertBatch() { }
    insertBatchIfNew() { }
    insertOrSpawnBatch() { }

    insertResource() { }
    insertResourceById() { }

    inspectEntity() { }

    isResourceAdded(resource: Resource) {
        const component_id = this.getResourceId(resource.type_id);
        return component_id == null ? false : this.isResourceAddedById(component_id);
    }

    isResourceAddedById(component_id: ComponentId) {
        const ticks = this.storages.resources.get(component_id)?.getTicks();
        return ticks ? isNewerThan(ticks.added, this.lastChangeTick(), this.readChangeTick()) : false;
    }

    isResourceChanged(resource: Resource) {
        const component_id = this.getResourceId(resource.type_id);
        return component_id == null ? false : this.isResourceChangedById(component_id);

    }
    isResourceChangedById(component_id: ComponentId) {
        const ticks = this.storages.resources.get(component_id)?.getTicks();
        return ticks ? isNewerThan(ticks.added, this.lastChangeTick(), this.readChangeTick()) : false;

    }

    iterEntities() { }

    iterResources() { }

    lastChangeTick() {
        return this.lastCheckTick;
    }

    lastChangeTickScope() { }


    modifyComponent() { }
    modifyComponentById() { }

    query() { }
    queryFiltered() { }

    readChangeTick() {
        return this.changeTick;
    }

    registerBundle() { }
    registerComponent(component: Component): ComponentId {
        return this.componentsRegistrator().__registerComponent(component);
    }
    registerComponentHooks() { }
    registerComponentHooksById() { }
    registerComponentWithDescriptor() { }
    registerDisablingComponent() { }
    registerDynamicBundle() { }
    registerRequiredComponents() { }
    registerRequiredComponentsWith() { }
    registerResource(resource: Resource) {
        return this.componentsRegistrator().__registerResource(resource);
    }
    registerResourceWithDescriptor(descriptor: ComponentDescriptor) {
        return this.componentsRegistrator().__registerWithDescriptor(descriptor);
    }
    registerSystem() { }
    registerSystemCached() { }
    removeResource() { }
    removeResourceById() { }

    removed() {
    }
    removedComponents(component_id: ComponentId) {

    }
    removedWithId() { }

    resource() { }
    resourceId() { }
    resourceMut() { }
    resourceRef() { }

    resourceScope() { }

    runSchedule() { }
    runSystem() { }
    runSystemCached() { }
    runSystemCachedWith() { }

    scheduleScope() { }

    sendEvent() { }
    sendEventDefault() { }
    sendEventBatch() { }

    spawn() { }
    spawnBatch() { }
    spawnEmpty() { }

    trigger() { }
    triggerRef() { }
    triggerTargets() { }
    triggerTargetsDynamic() { }
    triggerTargetsDynamicRef() { }
    triggerTargetsRef() { }

    tryDespawn() { }
    tryInsertBatch() { }
    tryInsertBatchIfNew() { }

    tryQuery() { }
    tryQueryFiltered() { }

    tryRegisterRequiredComponents() { }
    tryRegisterRequiredComponentsWith() { }

    tryResourceScope() { }
    tryRunSchedule() { }
    tryScheduleScope() { }

    unregisterSystem() { }
    unregisterSystemCached() { }

    __bootstrap() { }
}