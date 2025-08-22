import { insert, entry } from "@repo/util";
import type { ComponentId, Tick } from "../component";
import type { Components } from "../component/info";
import type { RequiredComponentConstructor } from "../component/required";
import { type SparseSets, type Storages, type Table, type TableRow } from "../storage";
import { StorageType } from "../component/storage-type";
import { iter } from "joshkaposh-iterator";
import type { Entity } from "../entity";
import { debugAssert } from "@repo/util/assert";
import type { DynamicBundle } from "./types";
import { ComponentStatus, type BundleComponentStatus } from "../archetype";


export type BundleId = number;

export type InsertMode = 0 | 1;
export const InsertMode = {
    Replace: 0,
    Keep: 1,
} as const;

export class BundleInfo {
    readonly id: BundleId;
    readonly contributed_component_ids: ComponentId[];
    readonly required_component_contructors: RequiredComponentConstructor[];

    readonly explicit_component_len: number;
    readonly explicit_components: ComponentId[];
    readonly required_components: ComponentId[];

    constructor(
        bundle_type_name: string,
        storages: Storages,
        components: Components,
        component_ids: ComponentId[],
        id: BundleId,
    ) {
        const explicit_component_ids = new Set(component_ids);

        // check for duplicates
        if (explicit_component_ids.size !== component_ids.length) {
            const seen = new Set<ComponentId>();
            const dups = [];
            for (const id of component_ids) {
                if (!insert(seen, id)) {
                    dups.push(id);
                }
            }

            const names = dups.map(id => components.getInfo(id)!.name).join(', ');
            throw new Error(`Bundle ${bundle_type_name} has duplicate components: [ ${names} ]`);
        }

        const depth_first_components = new Map();
        for (const component_id of component_ids) {
            const info = components.getInfo(component_id)!;
            for (const [required_id, required_component] of info.required_components.__all) {
                depth_first_components.set(required_id, required_component.clone());
            }

            storages.prepare_component(info);
        }

        const required_components = iter(depth_first_components)
            .filter(([required_id]) => !explicit_component_ids.has(required_id))
            .inspect(([required_id]) => {
                storages.prepare_component(components.getInfo(required_id)!);
                component_ids.push(required_id);
            })
            .map(([_, required_component]) => required_component.ctor)
            .collect();


        const explicit_component_len = component_ids.length - required_components.length;

        this.id = id;
        this.explicit_component_len = explicit_component_len;
        this.contributed_component_ids = component_ids;
        this.required_component_contructors = required_components;
        this.explicit_components = component_ids.slice(0, explicit_component_len);
        this.required_components = component_ids.slice(explicit_component_len);
    }

    static __initializeRequiredComponent(
        table: Table,
        sparse_sets: SparseSets,
        change_tick: Tick,
        table_row: TableRow,
        entity: Entity,
        component_id: ComponentId,
        storage_type: StorageType,
        component_ptr: object,
    ) {
        if (storage_type === StorageType.Table) {
            table.getColumn(component_id)!.__initialize(table_row, component_ptr, change_tick);
        } else {
            sparse_sets.get(component_id)!.__set(entity, component_ptr, change_tick);
        }
    }

    get contributed_components() {
        return this.contributed_component_ids;
    }

    __writeComponents<T extends DynamicBundle, S extends BundleComponentStatus>(
        table: Table,
        sparse_sets: SparseSets,
        bundle_component_status: S,
        required_components: Iterable<RequiredComponentConstructor>,
        entity: Entity,
        table_row: TableRow,
        change_tick: Tick,
        bundle: T,
        insert_mode: InsertMode
    ) {
        let bundle_component = 0;
        const after_effect = bundle.getComponents((storage_type, component_ptr) => {
            const component_id = this.contributed_component_ids[bundle_component]!;
            const status = bundle_component_status.getStatus(bundle_component);
            if (storage_type === StorageType.Table) {
                const column = table.getColumn(component_id)!;
                debugAssert(column != null);
                if (status === ComponentStatus.Added) {
                    column.__initialize(table_row, component_ptr, change_tick);
                } else if (status === ComponentStatus.Existing && insert_mode === InsertMode.Replace) {
                    column.__replace(table_row, component_ptr, change_tick);
                } else if (status === ComponentStatus.Existing && insert_mode === InsertMode.Keep) {
                    table.getDropFor(component_id)?.call(null, component_ptr);
                }
            } else {
                const sparse_set = sparse_sets.get(component_id)!;
                debugAssert(sparse_set != null);

                if (status === ComponentStatus.Added || insert_mode === InsertMode.Replace) {

                } else if (status === ComponentStatus.Existing && insert_mode === InsertMode.Keep) {
                    sparse_set.getDrop()?.call(null, component_ptr);
                }
            }
            bundle_component++;
        });

        for (const required_component of required_components) {
            required_component.initialize(table, sparse_sets, change_tick, table_row, entity);
        }

        return after_effect;
    }

}