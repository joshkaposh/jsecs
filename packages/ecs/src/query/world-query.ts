import type { Option } from "joshkaposh-option";
import type { Archetype } from "../archetype";
import { type Component, type Components, type Tick, type ComponentId, StorageType } from "../component";
import type { Table } from "../storage";
import { FilteredAccess } from "./access";

type World = any;

export function is_dense(ty: Component) {
    return ty.storage_type === StorageType.Table
}

export type WorldQueryState<T> = T extends WorldQuery<infer Fetch> ? Fetch : never;
export type WorldQueryFetch<T> = T extends WorldQuery<any, infer State> ? State : never;

export interface WorldQuery<Fetch extends any = any, State extends any = any> {
    // readonly [$WorldQuery]: true;
    readonly IS_DENSE: boolean;

    init_fetch(world: World, state: State, last_run: Tick, this_run: Tick): Fetch;

    set_archetype(fetch: Fetch, state: State, archetype: Archetype, table: Table): void;

    set_table(fetch: Fetch, state: State, table: Table): void;

    init_state(world: World): State;

    get_state(components: Components): Option<State>;

    update_component_access(state: State, access: FilteredAccess): void;

    matches_component_set(state: State, set_contains_id: (component_id: ComponentId) => boolean): boolean;

}