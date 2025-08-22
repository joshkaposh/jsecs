import { type Option, u32 } from 'joshkaposh-option';
import { iter } from 'joshkaposh-iterator';
import { swapPop } from '@repo/util';
import { assert } from '@repo/util/assert';

type SystemMeta = any;
type World = any;


export type Entity = number;
export const Entity = Symbol.for('Entity');

const MAX = u32.MAX;

const ArchetypeId = {
    INVALID: MAX
}
const TableId = {
    INVALID: MAX
}

const TableRow = {
    INVALID: MAX
}

const ArchetypeRow = {
    INVALID: MAX
}


const index_mask = 0b00000000_00000000_11111111_11111111;
const generation_mask = 0b11111111_11111111_00000000_00000000;

export function index(id: number) {
    return id & index_mask
}

export function generation(id: number) {
    return (id & generation_mask) >> 16;
}

export function id(index: number, generation = 1) {
    return (generation << 16) | index;
}

export function estr(entity: number) {
    return entity === MAX ? 'PLACEHOLDER' : `${index(entity)}V${generation(entity)}`;
}

type ArchetypeId = number;
type ArchetypeRow = number;

type TableId = number;
type TableRow = number;

export type EntityLocation = {
    archetype_id: ArchetypeId;
    archetype_row: ArchetypeRow;
    table_id: TableId;
    table_row: TableRow;
}
export const EntityLocation = {
    get INVALID(): EntityLocation {
        return {
            archetype_id: ArchetypeId.INVALID,
            archetype_row: ArchetypeRow.INVALID,
            table_id: TableId.INVALID,
            table_row: TableRow.INVALID,
        }
    }
} as const;

type EntityMeta = {
    // The current generation of the Entity
    // generation is non-zero
    generation: number;
    // The current location of the Entity
    location: EntityLocation;
}
const EntityMeta = {
    get EMPTY(): EntityMeta {
        return {
            generation: 1,
            location: EntityLocation.INVALID
        }
    }
} as const

export const PLACEHOLDER = u32.MAX;

export type AllocAtWithoutReplacement = 0 | 1 | EntityLocation;
export const AllocAtWithoutReplacement = {
    DidNotExist: 0,
    ExistsWithWrongGeneration: 1,
    Exists(location: EntityLocation) {
        return location
    }
} as const;


class Entities {

    __meta: EntityMeta[];
    /// The `pending` and `free_cursor` fields describe three sets of Entity IDs
    /// that have been freed or are in the process of being allocated:
    ///
    /// - The `freelist` IDs, previously freed by `free()`. These IDs are available to any of
    ///   [`alloc`], [`reserve_entity`] or [`reserve_entities`]. Allocation will always prefer
    ///   these over brand new IDs.
    ///
    /// - The `reserved` list of IDs that were once in the freelist, but got reserved by
    ///   [`reserve_entities`] or [`reserve_entity`]. They are now waiting for [`flush`] to make them
    ///   fully allocated.
    ///
    /// - The count of new IDs that do not yet exist in `self.meta`, but which we have handed out
    ///   and reserved. [`flush`] will allocate room for them in `self.meta`.
    ///
    /// The contents of `pending` look like this:
    ///
    /// ```txt
    /// ----------------------------
    /// |  freelist  |  reserved   |
    /// ----------------------------
    ///              ^             ^
    ///          free_cursor   pending.len()
    /// ```
    ///
    /// As IDs are allocated, `free_cursor` is atomically decremented, moving
    /// items from the freelist into the reserved list by sliding over the boundary.
    ///
    /// Once the freelist runs out, `free_cursor` starts going negative.
    /// The more negative it is, the more IDs have been reserved starting exactly at
    /// the end of `meta.len()`.
    ///
    /// This formulation allows us to reserve any number of IDs first from the freelist
    /// and then from the new IDs, using only a single atomic subtract.
    ///
    /// Once [`flush`] is done, `free_cursor` will equal `pending.len()`.
    ///
    /// [`alloc`]: Entities::alloc
    /// [`reserve_entity`]: Entities::reserve_entity
    /// [`reserve_entities`]: Entities::reserve_entities
    /// [`flush`]: Entities::flush
    __pending: number[];

    __free_cursor: number;
    /// Stores the number of free entities for [`len`](Entities::len)
    __len: number;

    constructor() {
        this.__meta = [];
        this.__pending = [];
        this.__free_cursor = 0;
        this.__len = 0;
    }

    static init_state() { }

    static get_param(_state: void, _system_meta: SystemMeta, world: World) {
        return world.entities;
    }

    reserveEntity(): Entity {
        // fetch_sub() subtracts and returns the previous value
        // let n = self.free_cursor.fetch_sub(1, Ordering::Relaxed);
        const n = this.__free_cursor;
        this.__free_cursor -= 1;

        if (n > 0) {
            // allocate from the freelist
            const index = this.__pending[n - 1]!;
            return id(index, this.__meta[index]!.generation);
        } else {
            // grab a new ID, outside the range of 'meta.len()'.
            // 'flush()' must eventually be callid to make the ID valid
            // 
            // As self.free_cursor goes more and more negative, we return IDs farther
            // and farther beyond 'meta.len()'

            // Entity::from_raw(
            // u32::try_from(self.meta.len() as IdCursor - n).expect("too many entities"),
            // )
            return id(this.__meta.length - n);
            // return Entity.from_raw(this.__meta.length - n)
        }
    }

    private __verifyFlushed() {
        assert(!this.needsFlush())
    }


    // Allocate an entity ID directly.
    alloc(): Entity {
        this.__verifyFlushed();
        this.__len += 1;
        const index = this.__pending.pop();
        if (index != null) {

            const new_free_cursor = this.__pending.length;
            this.__free_cursor = new_free_cursor;
            return id(index, this.__meta[index]!.generation);
        } else {
            // let index = u32::try_from(self.meta.len()).expect("too many entities");
            // const index = clamp_unchecked(this.__meta.length, 0, u32.MAX);
            const index = this.__meta.length;

            this.__meta[index] = EntityMeta.EMPTY;
            return id(index)
        }
    }

    // Allocate a specific entity ID, overwriting its generation.
    // Returns the location of the entity currently using the given ID, if any. Location should be written immediately.
    allocAt(entity: Entity): Option<EntityLocation> {
        this.__verifyFlushed();

        let loc;
        const e_index = index(entity);

        // loc should equal None || EntityLocation (from bottom else)
        if (index(entity) >= this.__meta.length) {
            // TODO('Entities.__alloc_at() extend call')
            // extend(this.__pending, this.__meta.length, index(entity));
            const new_free_cursor = this.__pending.length;
            this.__free_cursor = new_free_cursor;
            this.__meta[e_index + 1] = EntityMeta.EMPTY;
            this.__len += 1;
        } else {
            const i = this.__pending.findIndex(item => item === index(entity));
            if (i >= 0) {
                swapPop(this.__pending, i);
                const new_free_cursor = this.__pending.length;
                this.__free_cursor = new_free_cursor;
                this.__len += 1;
            } else {
                loc = EntityMeta.EMPTY.location
                this.__meta[index(entity)]!.location = loc
            }
        }

        this.__meta[index(entity)]!.generation = generation(entity);
        return loc;
    }

    __allocAtWithoutReplacement(entity: Entity): AllocAtWithoutReplacement {
        this.__verifyFlushed();

        const i = index(entity);
        let result;
        if (i >= this.__meta.length) {
            // TODO
            // TODO('Entities.__alloc_at_without_replacement() extend call')
            // extend(this.__pending, this.__meta, i);
            const new_free_cursor = this.__pending.length;
            this.__free_cursor = new_free_cursor;
            this.__meta.length = i + 1;
            this.__meta[this.__meta.length - 1] = EntityMeta.EMPTY;
            // resize(this.__meta, i + 1, EntityMeta.EMPTY);
            this.__len += 1;
            result = AllocAtWithoutReplacement.DidNotExist;
        } else {
            const index = this.__pending.findIndex(item => item === i)
            if (index >= 0) {
                swapPop(this.__pending, index);
                const new_free_cursor = this.__pending.length;
                this.__free_cursor = new_free_cursor;
                this.__len += 1;
                result = AllocAtWithoutReplacement.DidNotExist;
            } else {
                const current_meta = this.__meta[i]!;
                if (current_meta.location.archetype_id === ArchetypeId.INVALID) {
                    result = AllocAtWithoutReplacement.DidNotExist;
                } else if (current_meta.generation === generation(entity)) {
                    result = AllocAtWithoutReplacement.Exists(current_meta.location);
                } else {
                    return AllocAtWithoutReplacement.ExistsWithWrongGeneration;
                }
            }
        }

        this.__meta[i]!.generation = generation(entity);
        return result;
    }

    // Destroy an entity, allowing it to be reused.
    // Must not be called while reserved entities are awaiting flush()
    free(entity: Entity): Option<EntityLocation> {
        this.__verifyFlushed();

        const i = index(entity);
        const meta = this.__meta[i]!;

        if (meta.generation !== generation(entity)) {
            return
        }

        meta.generation = meta.generation + 1;
        if (meta.generation === 1) {
            console.warn(`Entity(${i}) generation wrapped on Entities::free, aliasing may occur`);
        }

        const loc = meta.location;

        meta.location = EntityMeta.EMPTY.location;

        this.__pending.push(i);

        const new_free_cursor = this.__pending.length;
        this.__free_cursor = new_free_cursor;
        this.__len -= 1;

        return loc
    }

    reserve(_additional: number) {
        // const freelist_size = this.__free_cursor;
        // const shortfall = additional - freelist_size;

        // if (shortfall > 0) {
        // this.__meta.length = Math.min(this.__meta.length, shortfall);
        // reserve(this.__meta, shortfall);
        // }
    }


    contains(entity: Entity): boolean {
        // self.resolve_from_id(entity.index())
        // .map_or(false, |e| e.generation() == entity.generation())
        const e = this.resolveFromId(index(entity));
        return e != null && generation(e) === generation(entity)

    }

    // Clears all Entity(s) from the World
    clear() {
        this.__meta.length = 0;
        this.__pending.length = 0;
        this.__free_cursor = 0;
        this.__len = 0;
    }

    // Returns the location of an Entity. Note: for pending entities, returns Some(EntityLocation::INVALID).
    get(entity: Entity): Option<EntityLocation> {
        const meta = this.__meta[index(entity)];
        if (meta) {
            return (meta.generation !== generation(entity)
                || meta.location.archetype_id === ArchetypeId.INVALID) ?
                null :
                meta.location
        }

        return null
    }

    /**
     * Updates the location of an [`Entity`]. This must be called when moving the components of
     * the entity around in storage.
     * 
     * # Safety
     * - `index` must be a valid entity index.
     * - `location` must be valid for the entity at `index` or immediately made valid afterwards
     *    before handing control to unknown code.
     */
    __set(index: number, location: EntityLocation) {
        // SAFETY: Caller guarantees that `index` a valid entity index
        // self.meta.get_unchecked_mut(index as usize).location = location;
        this.__meta[index]!.location = location;
    }

    __reserveGenerations(index: number, generations: number): boolean {
        if (index >= this.__meta.length) {
            return false
        }

        const meta = this.__meta[index]!;

        if (meta.location.archetype_id === ArchetypeId.INVALID) {
            // meta.generation = IdentifierMask::inc_masked_high_by(meta.generation, generations);
            meta.generation = meta.generation + generations;
            return true
        }

        return false
    }

    /**
     * 
     * Get the [`Entity`] with a given id, if it exists in this [`Entities`] collection
     * Returns `None` if this [`Entity`] is outside of the range of currently reserved Entities
     *
     * Note: This method may return [`Entities`](Entity) which are currently free
     * Note that [`contains`](Entities::contains) will correctly return false for freed
     * entities, since it checks the generation
     */
    resolveFromId(index: number): Option<Entity> {
        const idu = index // index as usize;
        const meta = this.__meta[idu];
        if (meta) {
            return id(index, meta.generation)
        } else {
            // 'id' is outside of the meta list - check whether it is reserved but not yet flushed
            const free_cursor = this.__free_cursor;
            // If this entity was manually created, then free_cursor might be positive
            // Returning None handles that case correctly

            // let num_pending = usize::try_from(-free_cursor).ok()?;
            const num_pending = -free_cursor;
            return (idu < this.__meta.length + num_pending) ? id(index) : null
        }
    }

    needsFlush(): boolean {
        return this.__free_cursor !== this.__pending.length;
    }

    /**
     * 
     * Allocates space for entities previously reserved with [`reserve_entity`](Entities::reserve_entity) or
     * [`reserve_entities`](Entities::reserve_entities), then initializes each one using the supplied function.
     *
     * # Safety
     * Flush _must_ set the entity location to the correct [`ArchetypeId`] for the given [`Entity`]
     * each time init is called. This _can_ be [`ArchetypeId::INVALID`], provided the [`Entity`]
     * has not been assigned to an [`Archetype`][crate::archetype::Archetype].
     *
     * Note: freshly-allocated entities (ones which don't come from the pending list) are guaranteed
     * to be initialized with the invalid archetype.
     */
    flush(init: (entity: Entity, entity_location: EntityLocation) => void) {
        const free_cursor = this.__free_cursor,
            current_free_cursor = free_cursor,
            meta = this.__meta;

        let new_free_cursor;
        if (current_free_cursor >= 0) {
            new_free_cursor = current_free_cursor// current_free_cursor as usize;
        } else {
            const old_meta_len = meta.length;
            const new_meta_len = old_meta_len + -current_free_cursor // -current_free_cursor as usize;
            meta.length = new_meta_len;
            meta[meta.length - 1] = EntityMeta.EMPTY;
            // resize(meta, new_meta_len, EntityMeta.EMPTY);
            this.__len += -current_free_cursor //-current_free_cursor as u32;

            for (const [index, e_meta] of iter(meta).enumerate().skip(old_meta_len)) {
                init(id(index, e_meta.generation), e_meta.location)
            }
            this.__free_cursor = 0;
            new_free_cursor = 0;
        }
        const pending = this.__pending;
        this.__len += (pending.length - new_free_cursor) // as u32

        const indices = pending.splice(new_free_cursor, pending.length);
        for (let i = 0; i < indices.length; i++) {
            const index = indices[i]!;
            const entity_meta = meta[index]!;
            init(id(index, entity_meta?.generation), entity_meta.location);
        }
        // pending.splice(new_free_cursor, pending.length);
        // for (let i = new_free_cursor; i < pending.length; i++) {
        //     const meta = meta[i];
        //     init(id(i, meta.generation), meta.location);
        // }
        // for (const index of drain(this.__pending, range(new_free_cursor, this.__pending.length))) {
        //     const e_meta = meta[index];
        //     init(id(index, e_meta.generation), e_meta.location)
        // }
    }

    /**
     * Flushes all reserved entities to an “invalid” state.
     * Attempting to retrieve them will return None unless they are later populated with a valid archetype.
     */
    flushAsInvalid() {
        // SAFETY: as per `flush` safety docs, the archetype id can be set to [`ArchetypeId::INVALID`] if
        // the [`Entity`] has not been assigned to an [`Archetype`][crate::archetype::Archetype], which is the case here
        this.flush((_, location) => {
            location.archetype_id = ArchetypeId.INVALID
        })
    }

    // /**
    //  * Safety
    //  * This function is safe if and only if the world this Entities is on has no entities.
    //  */
    // flushAndReserveInvalidAssumingNoEntities(count: number) {
    //     this.__free_cursor = 0;
    //     reserve(this.__meta, count);
    //     // the EntityMeta struct only contains integers, and it is valid to have all bytes set to u8::MAX
    //     //   self.meta.as_mut_ptr().write_bytes(u8::MAX, count);
    //     TODO('Entities::flush_and_reserve_invalid_assuming_no_entities: self.meta.as_mut_ptr().write_bytes(u8::MAX, count)')
    //     this.__meta.length = count;
    //     this.__len = count; // count as u32
    // }

    /**
     * The count of all entities in the World that have ever been allocated including the entities that are currently freed.
     * 
     * This does not include entities that have been reserved but have never been allocated yet.
     */
    get total_count(): number {
        return this.__meta.length
    }

    /**
     * The count of currently allocated entities.
     */
    get length(): number {
        return this.__len;
    }

    /**
     * true if any entity is currently active
     */
    get is_empty(): boolean {
        return this.__len === 0;
    }
}


export { Entities }