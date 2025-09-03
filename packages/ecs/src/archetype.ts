import { iter, Iterator } from "joshkaposh-iterator";
import { check, u32, type Option } from 'joshkaposh-option'
import { entry, swapPop, splitAt } from "@repo/util";
import { Components } from "./component/components";
import { StorageType } from "./component/storage-type";
import type { Entity, EntityLocation } from "./entity/entity";
import { type TableRow, TableId, SparseSet } from './storage';
// import type { SystemMeta } from "./system/function-system";
// import type { World } from "./world/world.types";


type World = unknown;
type SystemMeta = unknown;

type ComponentId = number;
type BundleId = number;

export type ArchetypeGeneration = number;
export const ArchetypeGeneration = {
    initial() {
        return ArchetypeId.EMPTY;
    }
} as const;

export type ArchetypeId = number;
export const ArchetypeId = {
    EMPTY: 0,
    INVALID: u32.MAX,
}


export type ComponentStatus = 0 | 1;
export const ComponentStatus = {
    Added: 0,
    Existing: 1,
} as const;

export class ArchetypeAfterBundleInsert implements BundleComponentStatus {
    archetype_id: ArchetypeId;
    __bundle_status: ComponentStatus[];
    required_components: any[];
    __added: ComponentId[];
    __existing: ComponentId[];

    constructor(
        archetype_id: ArchetypeId,
        bundle_status: ComponentStatus[],
        required_components: any[],
        added: ComponentId[],
        existing: ComponentId[],
    ) {
        this.archetype_id = archetype_id
        this.__bundle_status = bundle_status
        this.required_components = required_components
        this.__added = added
        this.__existing = existing
    }

    iterInserted(): Iterator<ComponentId> {
        return iter(this.__added).chain(this.__existing);
    }

    iterAdded(): Iterable<number> & ArrayLike<number> {
        return this.__added;
    }

    iterExisting(): Iterable<number> & ArrayLike<number> {
        return this.__existing;
    }

    getStatus(index: number): ComponentStatus {
        return this.__bundle_status[index]!;
    }
}

export type BundleComponentStatus = {
    getStatus(index: number): ComponentStatus;
}

export const SpawnBundleStatus = {
    getStatus(_index: number) {
        return ComponentStatus.Added;
    }
} as const;

export class Edges {
    #insert_bundle: Option<ArchetypeAfterBundleInsert>[];
    #remove_bundle: Option<ArchetypeId>[]
    #take_bundle: Option<ArchetypeId>[]
    constructor(
        insert_bundle: Option<ArchetypeAfterBundleInsert>[] = [],
        remove_bundle: Option<ArchetypeId>[] = [],
        take_bundle: Option<ArchetypeId>[] = [],
    ) {
        this.#insert_bundle = insert_bundle;
        this.#remove_bundle = remove_bundle;
        this.#take_bundle = take_bundle;
    }

    getArchetypeAfterBundleInsert(bundle_id: BundleId): Option<ArchetypeId> {
        return this.__getArchetypeAfterBundleInsertInternal(bundle_id)?.archetype_id;
    }

    __getArchetypeAfterBundleInsertInternal(bundle_id: BundleId): Option<ArchetypeAfterBundleInsert> {
        return this.#insert_bundle[bundle_id]
    }

    cacheArchetypeAfterBundleInsert(bundle_id: BundleId, archetype_id: ArchetypeId, bundle_status: ComponentStatus[], required_components: any[], added: ComponentId[], existing: ComponentId[]) {
        this.#insert_bundle[bundle_id] = new ArchetypeAfterBundleInsert(
            archetype_id,
            bundle_status,
            required_components,
            added,
            existing
        );
    }

    __getArchetypeAfterBundleRemoveInternal(bundle_id: BundleId): Option<ArchetypeId> {
        return this.#remove_bundle[bundle_id]
    }

    cacheArchetypeAfterBundleRemove(bundle_id: BundleId, archetype_id: Option<ArchetypeId>) {
        this.#remove_bundle[bundle_id] = archetype_id;
    }

    __getArchetypeAfterBundleTakeInternal(bundle_id: BundleId): Option<ArchetypeId> {
        return this.#take_bundle[bundle_id];
    }

    cacheArchetypeAfterBundleTake(bundle_id: BundleId, archetype_id: Option<ArchetypeId>) {
        this.#take_bundle[bundle_id] = archetype_id;
    }
}

export interface InternalArchetypeEntity {
    entity: Entity;
    table_row: TableRow;
    id(): Entity;
}

export class ArchetypeEntity {
    entity: Entity;
    table_row: TableRow;
    constructor(entity: Entity, table_row: TableRow) {
        this.entity = entity;
        this.table_row = table_row;
    }

    get id() {
        return this.entity;
    }
}

type ArchetypeSwapRemoveResult = {
    swapped_entity: Option<Entity>;
    table_row: TableRow;
}

type ArchetypeComponentInfo = {
    storage_type: StorageType;
}

export type ArchetypeRow = number;
export const ArchetypeRow = {
    INVALID: u32.MAX
} as const;

export type ArchetypeFlags = number;
export const ArchetypeFlags = {
    ON_ADD_HOOK: 1 << 0,
    ON_INSERT_HOOK: 1 << 1,
    ON_REPLACE_HOOK: 1 << 2,
    ON_REMOVE_HOOK: 1 << 3,
    ON_DESPAWN_HOOK: 1 << 4,
    ON_ADD_OBSERVER: 1 << 5,
    ON_INSERT_OBSERVER: 1 << 6,
    ON_REPLACE_OBSERVER: 1 << 7,
    ON_REMOVE_OBSERVER: 1 << 8,
    ON_DESPAWN_OBSERVER: 1 << 9,
    empty: 0
} as const;

class Observers {
    updateArchetypeFlags(_component_id: ComponentId, flags: ArchetypeFlags) {
        return flags;
    }
};

export class Archetype {
    #id: ArchetypeId;
    #table_id: TableId;
    #edges: Edges;
    #entities: InternalArchetypeEntity[];
    #components: SparseSet<ArchetypeComponentInfo>;
    #table_components: readonly ComponentId[];
    #sparse_set_components: readonly ComponentId[];
    #flags: ArchetypeFlags;
    constructor(
        components: Components,
        component_index: ComponentIndex,
        observers: Observers,
        id: ArchetypeId,
        table_id: TableId,
        table_components: Iterable<ComponentId> & { length: number },
        sparse_set_components: Iterable<ComponentId> & { length: number }
    ) {
        const min_table = table_components.length;
        const min_sparse = sparse_set_components.length;
        // const archetype_components = SparseSet.withCapacity<ArchetypeComponentInfo>(min_table + min_sparse);

        const table_c: ComponentId[] = [];
        const sparse_c: ComponentId[] = [];
        let flags: ArchetypeFlags = ArchetypeFlags.empty;
        let it = table_components[Symbol.iterator]();
        const archetype_components = SparseSet.withCapacity<ArchetypeComponentInfo>(min_table + min_sparse);

        for (let i = 0, len = table_components.length; i < len; i++) {
            const component_id = it.next().value;
            const info = components.getInfo(component_id)!;
            table_c.push(component_id);

            info.updateArchetypeFlags(flags);
            observers.updateArchetypeFlags(component_id, flags);

            archetype_components.set(component_id, { storage_type: StorageType.Table });

            entry(component_index, component_id, () => new Map())
                .set(component_id, { column: i });
        }

        for (const component_id of sparse_set_components) {
            sparse_c.push(component_id);

            const info = components.getInfo(component_id)!;

            info.updateArchetypeFlags(flags);
            observers.updateArchetypeFlags(component_id, flags);

            archetype_components.set(component_id, {
                storage_type: StorageType.SparseSet
            });

            entry(component_index, component_id, () => new Map())
                .set(id, { column: null });
        }

        this.#id = id;
        this.#table_id = table_id;
        this.#entities = [];
        this.#components = archetype_components.intoImmutable();
        this.#table_components = table_c;
        this.#sparse_set_components = sparse_c;
        this.#edges = new Edges();
        this.#flags = flags;
    }

    get id(): ArchetypeId {
        return this.#id;
    }

    get table_id(): TableId {
        return this.#table_id;
    }

    /**
     * @summary Fetches the entities contained in this archetype.
     */
    get entities(): ArchetypeEntity[] {
        return this.#entities as unknown as ArchetypeEntity[];
    }

    get length(): number {
        return this.#entities.length;
    }

    /**
     * @returns Returns true if and only if no `Component`s are in this `Archetype`
     */
    get isEmpty(): boolean {
        return this.#entities.length === 0;
    }

    get componentCount() {
        return this.#components.length;
    }

    get flags() {
        return this.#flags;
    }
    /**
     * @description
     * Gets an iterator of all of the components stored in [`Table`]s.
     * 
     * All of the IDs are unique.
     */
    tableComponents(): Iterable<ComponentId> & ArrayLike<ComponentId> {
        // return this.#components.iter().filter_map(([id, component]) => component.storage_type === StorageType.Table ? id : null)
        return this.#table_components;
    }

    /**
     * @description
     * Gets an iterator of all of the components stored in [`ComponentSparseSet`]s.
     * 
     * All of the IDs are unique.
     */
    sparseSetComponents(): Iterable<ComponentId> & ArrayLike<ComponentId> {
        // return this.#components.iter().filter_map(([id, component]) => component.storage_type === StorageType.SparseSet ? id : null)
        return this.#sparse_set_components;
    }

    /**
     * @description
     * Gets an iterator of all of the components in the archetype.
     * 
     * All of the IDs are unique.
     */
    components(): Iterator<ComponentId> {
        return this.#components.keys();
    }

    __componentsArray(): ComponentId[] {
        return this.#components.inner_keys();
    }

    // __componentsWithArchetypeComponentId() {
    //     return this.#components.iter().map(([component_id, info]) => [component_id, info.archetype_component_id])
    // }

    /**
     * @description
     * 
     * `Edges` is a Graph data structure used by internal systems for lookups of `Component`s
     * 
     * @returns Returns a reference to `Edges` of an `Archetype`.
     */
    edges(): Edges {
        return this.#edges;
    }

    /**
     * @summary Checks if the archetype contains a specific component. This runs in `O(1)` time.
     */
    has(component_id: ComponentId): boolean {
        return this.#components.has(component_id)
    }

    /**
     * @description
     * Gets the type of storage where a component in the archetype can be found.
     * Returns `None` if the component is not part of the archetype.
     * This runs in `O(1)` time.
     */

    getStorageType(component_id: ComponentId): StorageType | undefined {
        return this.#components.get(component_id)?.storage_type
    }

    entityTableRow(row: ArchetypeRow) {
        return this.#entities[row]!.table_row;
    }

    setEntityTableRow(row: ArchetypeRow, table_row: TableRow) {
        this.#entities[row]!.table_row = table_row;
    }

    get hasAddHook() {
        return check(this.#flags, ArchetypeFlags.ON_ADD_HOOK);
    }

    get hasInsertHook() {
        return check(this.#flags, ArchetypeFlags.ON_ADD_HOOK);
    }

    get hasReplaceHook() {
        return check(this.#flags, ArchetypeFlags.ON_REPLACE_HOOK);
    }
    get hasRemoveHook() {
        return check(this.#flags, ArchetypeFlags.ON_REMOVE_HOOK);
    }

    get hasDespawnHook() {
        return check(this.#flags, ArchetypeFlags.ON_DESPAWN_HOOK);
    }

    hasAddObserver() {
        return check(this.#flags, ArchetypeFlags.ON_ADD_OBSERVER);
    }
    hasInsertObserver() {
        return check(this.#flags, ArchetypeFlags.ON_INSERT_OBSERVER);
    }
    hasReplaceObserver() {
        return check(this.#flags, ArchetypeFlags.ON_REPLACE_OBSERVER);
    }
    hasRemoveObserver() {
        return check(this.#flags, ArchetypeFlags.ON_REMOVE_OBSERVER);
    }

    hasDespawnObserver() {
        return check(this.#flags, ArchetypeFlags.ON_DESPAWN_OBSERVER);
    }

    /**
     * @summary Allocates an entity to the archetype
     * @description 
     * **Safety** - valid component values must be immediately written to the relevant storages.
     */
    // @ts-ignore
    allocate(entity: Entity, table_row: TableRow): EntityLocation {
        const archetype_row = this.#entities.length;
        this.#entities.push(new ArchetypeEntity(entity, table_row) as unknown as InternalArchetypeEntity);
        return {
            archetype_id: this.#id,
            archetype_row,
            table_id: this.#table_id,
            table_row
        }
    }

    __reserve(_additional: number) {
        // reserve(this.#entities, additional)
    }

    /**
     * @description
     * Removes the entity at `index` by swapping it out. Returns the table row the entity is stored
     * in.
     * @throws This function will **throw** if `index >= this.len()`
     */
    __swapRemove(row: ArchetypeRow): ArchetypeSwapRemoveResult {

        if (row >= this.length) {
            throw new RangeError(`index ${row} exceeds length ${this.length}`)
        }
        const last_idx = this.#entities.length - 1;
        const is_last = row === last_idx;
        const entity = swapPop(this.#entities, row);

        // console.log('Archetype swapPop: ', row, entity, this.#entities);

        return {
            swapped_entity: is_last ? null : this.#entities[row]!.entity,
            table_row: entity!.table_row
        }
    }

    __clearEntities() {
        this.#entities.length = 0;
    }
}

type ArchetypeComponents = {
    table_components: ComponentId[];
    sparse_set_components: ComponentId[];
};

/// An opaque unique joint ID for a [`Component`] in an [`Archetype`] within a [`World`].
///
/// A component may be present within multiple archetypes, but each component within
/// each archetype has its own unique `ArchetypeComponentId`. This is leveraged by the system
/// schedulers to opportunistically run multiple systems in parallel that would otherwise
/// conflict. For example, `Query<&mut A, With<B>>` and `Query<&mut A, Without<B>>` can run in
/// parallel as the matched `ArchetypeComponentId` sets for both queries are disjoint, even
/// though `&mut A` on both queries point to the same [`ComponentId`].
///
/// In SQL terms, these IDs are composite keys on a [many-to-many relationship] between archetypes
/// and components. Each component type will have only one [`ComponentId`], but may have many
/// [`ArchetypeComponentId`]s, one for every archetype the component is present in. Likewise, each
/// archetype will have only one [`ArchetypeId`] but may have many [`ArchetypeComponentId`]s, one
/// for each component that belongs to the archetype.
///
/// Every [`Resource`] is also assigned one of these IDs. As resources do not belong to any
/// particular archetype, a resource's ID uniquely identifies it.
///
/// These IDs are only valid within a given World, and are not globally unique.
/// Attempting to use an ID on a world that it wasn't sourced from will
/// not point to the same archetype nor the same component.
///
/// [`Component`]: crate::component::Component
/// [`World`]: crate::world::World
/// [`Resource`]: crate::system::Resource
/// [many-to-many relationship]: https://en.wikipedia.org/wiki/Many-to-many_(data_model)
export type ArchetypeComponentId = number;

type ArchetypeRecord = {
    column: Option<number>;
}

type ComponentIndex = Map<ComponentId, Map<ArchetypeId, ArchetypeRecord>>

function hashByComponents(ident: ArchetypeComponents) {
    return `${ident.table_components.join(',')}-${ident.sparse_set_components.join(',')}` as const
}


export class Archetypes {
    __archetypes: Archetype[];
    // #archetype_component_count: number;
    #by_components: Map<ReturnType<typeof hashByComponents>, ArchetypeId>;
    __by_component: ComponentIndex;

    constructor() {
        this.__archetypes = [];
        this.#by_components = new Map();
        this.__by_component = new Map();
        this.getIdOrSet(new Components(), new Observers(), TableId.empty, [], []);
    }

    static init_state() { }

    static get_param(_state: void, _system_meta: SystemMeta, world: World) {
        // @ts-expect-error
        return world.archetypes;
    }

    get generation() {
        return this.__archetypes.length;
    }

    /**
     * The total number of `Archetype`s registered to this world.
     */
    get length(): number {
        return this.__archetypes.length;
    }

    /**
     * @returns Returns a reference to the `Archetype` located at `ArchetypeId::EMPTY`
     */

    get empty(): Archetype {
        return this.__archetypes[ArchetypeId.EMPTY]!;
    }

    // newArchetypeComponentId(): ArchetypeComponentId {
    //     const id = this.#archetype_component_count;
    //     const count = u32.checked_add(this.#archetype_component_count, 1);
    //     if (is_none(count)) {
    //         throw new Error('archetype component count overflow')
    //     }
    //     this.#archetype_component_count = count;
    //     return id;
    // }

    /**
 * @summary Gets a reference to an `Archetype` by its `ArchetypeId`.
 * @returns Returns a reference to an `Archetype` or None if it doesn't exist.
 */
    get(archetype_id: ArchetypeId): Option<Archetype> {
        return this.__archetypes[archetype_id];
    }


    __get2(a: ArchetypeId, b: ArchetypeId): [Archetype, Archetype] {
        if (a > b) {
            const [b_slice, a_slice] = splitAt(this.__archetypes, a)!;
            return [a_slice[0]!, b_slice[b]!];
        } else {
            const [a_slice, b_slice] = splitAt(this.__archetypes, b)!;
            return [a_slice[a]!, b_slice[0]!];
        }
    }

    /**
     * @returns Returns an iterator over all the `Archetype`s contained in `Archetypes`
     */
    iter(): Iterator<Archetype> {
        return iter(this.__archetypes);
    }


    /**
     * @description
     *  Gets the archetype id matching the given inputs or inserts a new one if it doesn't exist.
     * `table_components` and `sparse_set_components` must be sorted
     * 
     *  **Safety**
     * 
     * [`TableId`] must exist in tables
     */
    getIdOrSet(
        components: Components,
        observers: Observers,
        table_id: TableId,
        table_components: ComponentId[],
        sparse_set_components: ComponentId[]
    ): [ArchetypeId, boolean] {

        const archetype_identity: ArchetypeComponents = {
            sparse_set_components,
            table_components
        }


        // const component_index = this.__by_component;
        const hash = hashByComponents(archetype_identity)
        const value = this.#by_components.get(hash);
        if (value != null) {
            return [value, false];
        } else {
            const archetypes = this.__archetypes;
            const component_index = this.__by_component;
            const id = archetypes.length;
            archetypes.push(new Archetype(
                components,
                component_index,
                observers,
                id,
                table_id,
                table_components,
                sparse_set_components
            ));
            this.#by_components.set(hash, id);
            return [id, true];
        }

        // return entry(this.#by_components, hashByComponents(archetype_identity), () => {
        //     const { table_components, sparse_set_components } = archetype_identity;
        //     const id = archetypes.length;
        //     const table_start = this.#archetype_component_count;
        //     this.#archetype_component_count += table_components.length;
        //     const table_archetype_components = new Range(table_start, this.#archetype_component_count);

        //     const sparse_start = this.#archetype_component_count;
        //     this.#archetype_component_count += sparse_set_components.length;
        //     const sparse_set_archetype_components = new Range(sparse_start, this.#archetype_component_count);
        //     archetypes.push(new Archetype(
        //         components,
        //         component_index,
        //         new Observers(),
        //         id,
        //         table_id,
        //         iter(table_components).zip(table_archetype_components),
        //         iter(sparse_set_components).zip(sparse_set_archetype_components)
        //     ))
        //     return id;
        // });
    }

    __clearEntities() {
        const archetypes = this.__archetypes;
        for (let i = 0; i < archetypes.length; i++) {
            archetypes[i]!.__clearEntities();
        }
    }

    __componentIndex() {
        return this.__by_component;
    }

    __updateFlags(component_id: ComponentId, flags: ArchetypeFlags, set: boolean) {
        const archetypes = this.__by_component.get(component_id);
        if (archetypes) {
            for (const archetype_id of archetypes.keys()) {
                const archetype = this.__archetypes[archetype_id]!;
                archetype.flags
                // bit.set_to()
            }
        }
    }

    iterRange(from = 0, to = this.__archetypes.length) {
        const amount = to - from;
        return iter(this.__archetypes).skip(from).take(amount);
    }

    clearEntities() {
        for (const archetype of this.__archetypes) {
            archetype.__clearEntities();
        }
    }

}