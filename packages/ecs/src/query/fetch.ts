import { unit } from "@repo/util";
import type { Entity } from "../entity";
import type { Table, TableRow } from "../storage";
import type { WorldQuery } from "./world-query";
import type { ComponentId, Components, Tick } from "../component";
import type { Archetype } from "../archetype";
import type { FilteredAccess } from "./access";
import type { Option } from "joshkaposh-option";

export interface QueryData<Item = any, Fetch = any, State = any> extends WorldQuery<Fetch, State> {
    readonly IS_READ_ONLY: boolean;

    provide_extra_access(): void;

    fetch(state: State, fetch: Fetch, entity: Entity, table_row: TableRow): Item;
}

class WorldQueryEntity implements QueryData<Entity, unit, unit>, ReleaseStateWorldQuery<Entity> {
    init_fetch(world: any, state: typeof unit, last_run: Tick, this_run: Tick): typeof unit {
        return unit;
    }

    IS_DENSE = true;
    IS_READ_ONLY = true;

    set_archetype(_fetch: typeof unit, _state: typeof unit, _archetype: Archetype, _table: Table): void { }

    set_table(_fetch: typeof unit, _state: typeof unit, _table: Table): void { }

    update_component_access(_state: typeof unit, _access: FilteredAccess): void { }

    init_state(_world: any): typeof unit {
        return unit;
    }

    get_state(_components: Components): Option<typeof unit> {
        return unit;
    }

    matches_component_set(_state: typeof unit, _set_contains_id: (component_id: ComponentId) => boolean): boolean {
        return true
    }

    fetch(_state: typeof unit, _fetch: typeof unit, entity: Entity, _table_row: TableRow): number {
        return entity;
    }

    provide_extra_access(): void {

    }

    release_state(item: Entity) {
        return item;
    }
}

export interface ReleaseStateWorldQuery<Item = any, Fetch = any, State = any> extends QueryData<Item, Fetch, State> {
    release_state(item: Item): Item;
}