import { Archetypes } from "../archetype";
import { Component, Components, Tick, type ComponentId } from "../component";
import { Entities } from "../entity";
import { Storages } from "../storage";
import { WorldId } from "./identifier";

type ComponentIds = any;
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
    readonly changeTick!: Tick;
    readonly lastCheckTick!: Tick;
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

    static default() {
        const id = WorldId();
        if (id == null) {
            throw new Error('More `World`s have been created than is supported');
        }
        const world = new World(
            id,
            new Entities(),
            new Components(),
            undefined,
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

    componentId() { }

    has() { }

    hasResource() { }

    hasResourceById() { }

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

    isResourceAdded() { }
    isResourceAddedById() { }
    isResourceChanged() { }
    isResourceChangedById() { }

    iterEntities() { }

    iterResources() { }

    lastChangeTick() { }

    lastChangeTickScope() { }


    modifyComponent() { }
    modifyComponentById() { }

    query() { }
    queryFiltered() { }

    readChangeTick() { }
    registerBundle() { }
    registerComponent(component: Component): ComponentId {
        return 0;
    }
    registerComponentHooks() { }
    registerComponentHooksById() { }
    registerComponentWithDescriptor() { }
    registerDisablingComponent() { }
    registerDynamicBundle() { }
    registerRequiredComponents() { }
    registerRequiredComponentsWith() { }
    registerResource() { }
    registerResourceWithDescriptor() { }
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