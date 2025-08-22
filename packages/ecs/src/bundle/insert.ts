import { debugAssert } from "@repo/util/assert";
import type { Archetype, ArchetypeId } from "../archetype";
import { ComponentsRegistrator, type Tick } from "../component";
import type { BundleId, BundleInfo, InsertMode } from "./info";
import type { Bundle, DynamicBundle } from "./types";
import type { Table } from "../storage";
import type { Entity, EntityLocation } from "../entity";

type World = unknown;

export class BundleInserter {
    #archetype_after_insert: any;
    #archetype: Archetype;
    #bundle_info: BundleInfo;
    #table: Table;
    #archetype_move_type: any;
    #change_tick: Tick;
    #world: World;
    constructor(
        archetype_after_insert: any,
        archetype: Archetype,
        bundle_info: BundleInfo,
        table: Table,
        archetype_move_type: any,
        change_tick: Tick,
        world: World
    ) {
        this.#archetype_after_insert = archetype_after_insert;
        this.#archetype = archetype;
        this.#bundle_info = bundle_info;
        this.#table = table;
        this.#archetype_move_type = archetype_move_type;
        this.#change_tick = change_tick;
        this.#world = world;
    }

    static new<T extends Bundle>(world: World, bundle: T, archetype_id: ArchetypeId, change_tick: Tick) {
        const registrator = new ComponentsRegistrator(world.components, world.component_ids);
        const bundle_id = world.bundles.registerInfo(bundle, registrator, world.storages);
        return BundleInserter.newWithId(world, archetype_id, bundle_id, change_tick);
    }

    static newWithId(world: World, archetype_id: ArchetypeId, bundle_id: BundleId, change_tick: Tick) {
        const bundle_info = world.bundles.get(bundle_id)!;
        bundle_id = bundle_info.id;
        const [new_archetype_id, is_new_created] = bundle_info.insertBundleIntoArchetype(world.archetypes,
            world.storages,
            world.components,
            world.observers,
            archetype_id
        );

        let inserter;
        if (new_archetype_id === archetype_id) {
            const archetype = world.archetypes.get(archetype_id)!;
            const archetype_after_insert = archetype.edges.getArchetypeAfterBundleInsertInternal(bundle_id)!;
            debugAssert(archetype_after_insert != null);

            const table_id = archetype.table_id;
            const table = world.storages.tables.get(table_id)!;

            inserter = new BundleInserter(
                archetype_after_insert,
                archetype,
                bundle_info,
                table,
                ArchetypeMoveType.SameArchetype,
                change_tick,
                world
            )
        } else {
            const [archetype, new_archetype] = world.archetypes.get2(archetype_id, new_archetype_id);
            const archetype_after_insert = archetype.edges.getArchetypeAfterBundleInsertInternal(bundle_id);
            debugAssert(archetype_after_insert != null);

            const table_id = archetype.table_id;
            const new_table_id = new_archetype.table_id;

            if (table_id === new_table_id) {
                const table = world.storages.tables.get(table_id)!;
                inserter = new BundleInserter(
                    archetype_after_insert,
                    archetype,
                    bundle_info,
                    table,
                    ArchetypeMoveType.NewArchetypeSameTable(new_archetype),
                    change_tick,
                    world
                )
            } else {
                const [table, new_table] = world.storages.tables.get2(table_id, new_table_id);
                inserter = new BundleInserter(
                    archetype_after_insert,
                    archetype,
                    bundle_info,
                    table,
                    ArchetypeMoveType.NewArchetypeNewTable(new_archetype, new_table),
                    change_tick,
                    world
                );
            }
        };

        if (is_new_created) {
            inserter.#world.intoDeferred().trigger(new ArchetypeCreated(new_archetype_id));
        }

        return inserter;
    }

    __insert<T extends DynamicBundle>(
        entity: Entity,
        loc: EntityLocation,
        bundle: T,
        insert_mode: InsertMode,
        relationship_hook_mode: RelationshipHookMode
    ) {
        const bundle_info = this.#bundle_info,
            archetype_after_insert = this.#archetype_after_insert,
            archetype = this.#archetype;

        const deferred_world = this.#world.intoDeferred();

        deferred_world.triggerOnReplace(archetype, entity, archetype_after_insert.iterExisting(), relationship_hook_mode);

        const table = this.#table;
        let new_archetype, new_location, after_effect;

        if (this.#archetype_move_type === ArchetypeMoveType.SameArchetype) {
            const sparse_sets = this.#world.storages.sparse_sets;

            after_effect = bundle_info.__writeComponents(
                table,
                sparse_sets,
                archetype_after_insert,
                archetype_after_insert.required_components,
                entity,
                loc.table_row,
                this.#change_tick,
                bundle,
                insert_mode
            );

            new_archetype = archetype;
            new_location = loc;
        } else if (!('new_table' in this.#archetype_move_type)) {

        } else {

        }

    }
}