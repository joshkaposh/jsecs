import type { ComponentInfo } from "../component/info";
import { Resources } from "./resources";
import { SparseSets } from "./sparse-set";
import { Tables } from "./table";

export * from './table';
export * from './sparse-set';
export * from './resources';

export class Storages {
    readonly tables: Tables;
    readonly sparse_sets: SparseSets;
    readonly resources: Resources;

    constructor(
        tables = new Tables(),
        sparse_sets = new SparseSets(),
        resources = new Resources()
    ) {
        this.tables = tables;
        this.sparse_sets = sparse_sets;
        this.resources = resources;
    }

    __prepareComponent(component: ComponentInfo) {
        //! 1 is always equal to StorageType.SparseSet
        if (component.storage_type === 1) {
            this.sparse_sets.__getOrSet(component);
        }
    }
}