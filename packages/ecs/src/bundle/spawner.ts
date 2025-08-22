import { Archetype, ArchetypeId, SpawnBundleStatus } from "../archetype";
import { ComponentsRegistrator, type Tick } from "../component";
import { EntityLocation, index, type Entity } from "../entity";
import { ADD, INSERT } from "../lifecycle";
import type { Table } from "../storage";
import { InsertMode, type BundleId, type BundleInfo } from "./info";
import type { Bundle, DynamicBundle } from "./types";

type World = unknown;

export class BundleSpawner {
    #bundle_info: BundleInfo;
    #table: Table;
    #archetype: Archetype;
    change_tick: Tick;
    #world: World;

    constructor(bundle_info: BundleInfo, table: Table, archetype: Archetype, change_tick: Tick, world: World) {
        this.#bundle_info = bundle_info;
        this.#table = table;
        this.change_tick = change_tick;
        this.#archetype = archetype;
        this.#world = world;
    }

    static new(world: World, change_tick: Tick) {
        const registrator = new ComponentsRegistrator(world.components, world.component_ids);
        const bundle_id = world.bundles.registerInfo(registrator, world.storages);
        return BundleSpawner.newWithId(world, bundle_id, change_tick);
    }

    static newWithId(world: World, bundle_id: BundleId, change_tick: Tick) {
        const bundle_info = world.bundles.get(bundle_id)!
        const [new_archetype_id, is_new_created] = bundle_info.insertBundleIntoArchetype(
            world.archetypes,
            world.storages,
            world.components,
            world.observers,
            ArchetypeId.EMPTY
        );

        const archetype = world.archetypes.get(new_archetype_id);
        const table = world.storages.tables.get(archetype.table_id);
        const spawner = new BundleSpawner(bundle_info, table, archetype, change_tick, world);
        if (is_new_created) {
            spawner
                .#world
                .intoDeferred()
                .trigger(new ArchetypeCreated(new_archetype_id));
        }
    }

    reserveStorage(additional: number) {
        this.#archetype.__reserve(additional);
        this.#table.__reserve(additional);
    }

    spawnNonExistent<T extends DynamicBundle>(entity: Entity, bundle: T): [EntityLocation, T['Effect']] {
        const bundle_info = this.#bundle_info,
            table = this.#table,
            archetype = this.#archetype,
            sparse_sets = this.#world.storages.sparse_sets,
            entities = this.#world.entities;

        const table_row = table.allocate(entity);
        const loc = archetype.allocate(entity, table_row);
        const after_effect = bundle_info.__writeComponents(table,
            sparse_sets,
            SpawnBundleStatus,
            bundle_info.required_component_contructors,
            entity,
            table_row,
            this.change_tick,
            bundle,
            InsertMode.Replace,
        );

        const idx = index(entity);
        entities.set(idx, loc);
        entities.markSpawnDespawn(idx, this.change_tick);

        const deferred_world = this.#world.intoDeferred();

        const contributed_components = bundle_info.contributed_components;

        deferred_world.triggerOnAdd(archetype, entity, contributed_components);

        if (archetype.hasAddObserver()) {
            deferred_world.triggerObservers(
                ADD,
                entity,
                contributed_components
            );

        }
        deferred_world.triggerOnInsert(archetype, entity, contributed_components);

        if (archetype.hasInsertObserver()) {
            deferred_world.triggerObservers(
                INSERT,
                entity,
                bundle_info.contributed_components
            );
        }

        return [loc, after_effect];
    }

    spawn<T extends Bundle>(bundle: T): [Entity, T['Effect']] {
        const entity = this.entities.alloc();
        const [_, after_effect] = this.spawnNonExistent(entity, bundle);
        return [entity, after_effect];
    }

    get entities() {
        return this.#world.entities;
    }

    flushCommands() {
        this.#world.flush();
    }

}