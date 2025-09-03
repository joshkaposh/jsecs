import type { Iterator } from "joshkaposh-iterator";
import type { Option } from "joshkaposh-option";
import { unit } from "@repo/util";
import { type ComponentTicks, type Tick, type Resource, Components, type ResourceComponentInfo, checkTicksNumber } from "../component";
import type { ArchetypeComponentId } from "../archetype";
import { Mut, TicksMut } from "../change-detection";
import { SparseSet } from "./sparse-set";

class ResourceData<R extends Resource> {
    #data: Option<InstanceType<R>>;
    #added_ticks: Tick;
    #changed_ticks: Tick;
    #type_name: string;
    #id: ArchetypeComponentId;

    constructor(id: ArchetypeComponentId, data: any, type_name: string, added_ticks: Tick, changed_ticks: Tick) {
        this.#id = id;
        this.#data = data;
        this.#type_name = type_name;
        this.#added_ticks = added_ticks;
        this.#changed_ticks = changed_ticks;
    }

    get name() {
        return this.#type_name;
    }

    get isPresent(): boolean {
        return this.#data != null
    }

    get id() {
        return this.#id;
    }

    getData(): Option<InstanceType<R>> {
        return this.#data;
    }

    getTicks(): ComponentTicks | undefined {
        return this.#data ? { added: this.#added_ticks, changed: this.#changed_ticks } : undefined;
    }

    getMut(last_run: Tick, this_run: Tick): Mut<R> | undefined {
        const data = this.getWithTicks();
        if (data) {
            return new Mut<R>(data[0], TicksMut.fromCells(data[1], last_run, this_run));
        }
    }

    getWithTicks(): Option<[InstanceType<R>, ComponentTicks]> {
        const self = this;
        return this.#data ? [this.#data as InstanceType<R>, { get added() { return self.#added_ticks }, get changed() { return self.#changed_ticks } }] : undefined;
    }

    set(value: InstanceType<R>, change_tick: Tick) {
        if (this.#data) {
            this.#data = value
        } else {
            this.#data = value;
            this.#added_ticks = change_tick;
        }
        this.#changed_ticks = change_tick;
    }

    setWithTicks(value: InstanceType<R>, change_ticks: ComponentTicks) {
        this.#data = value;
        this.#added_ticks = change_ticks.added;
        this.#changed_ticks = change_ticks.changed;
    }

    delete(): Option<[InstanceType<R>, ComponentTicks]> {
        if (!this.#data) {
            return;
        }

        const res = this.#data as InstanceType<R>;
        this.#data = null;
        const self = this
        return [res, { get added() { return self.#added_ticks }, get changed() { return self.#changed_ticks } }];
    }

    deleteAndDrop() {
        this.#data = null;
        return unit;
    }

    checkChangeTicks(change_tick: Tick) {
        const added = this.#added_ticks;
        const changed = this.#changed_ticks;
        this.#added_ticks = checkTicksNumber(added, change_tick);
        this.#added_ticks = checkTicksNumber(changed, change_tick);
    }
}

type ComponentId = number;

export class Resources {
    #resources: SparseSet<ResourceData<Resource>>;
    constructor() {
        this.#resources = new SparseSet();
    }

    /**
     * The total amount of resources.
     */
    get length(): number {
        return this.#resources.length;
    }

    /**
     * Is true if no resources exist.
     */
    get isEmpty(): boolean {
        return this.#resources.isEmpty
    }

    checkChangeTicks(change_tick: Tick) {
        this.#resources.values().for_each(info => info.checkChangeTicks(change_tick))
    }

    clear() {
        this.#resources.clear();
    }

    iter(): Iterator<[ComponentId, ResourceData<Resource>]> {
        return this.#resources.iter();
    }

    get<R extends Resource>(component_id: ComponentId): Option<ResourceData<R>> {
        return this.#resources.get(component_id) as Option<ResourceData<R>>
    }

    getMut<R extends Resource>(component_id: ComponentId): Option<ResourceData<R>> {
        return this.#resources.getMut(component_id) as Option<ResourceData<R>>
    }

    /**
     *
     *  @description
     * Fetches or initializes a new resource and returns back it's underlying column.
     * @throws Will Error if `component_id` is not valid for the provided `components`
     */
    __initializeWith<R extends Resource>(component_id: ComponentId, components: Components, f: () => ArchetypeComponentId): ResourceData<R> {
        return this.#resources.getOrSetWith(component_id, () => {
            const component_info = components.getInfo(component_id) as ResourceComponentInfo;
            return new ResourceData(
                f(),
                component_info.type,
                component_info.name,
                0,
                0,
            )
        }) as ResourceData<R>;
    }
}

// export class ThinResources {
//     #resources: ThinSparseSet<ResourceData<Resource>>;
//     constructor() {
//         this.#resources = new ThinSparseSet();
//     }

//     get length(): number {
//         return this.#resources.length;
//     }

//     get isEmpty(): boolean {
//         return this.#resources.isEmpty;
//     }

//     checkChangeTicks(change_tick: Tick) {
//         const dense = this.#resources.inner_values();
//         for (let i = 0; i < dense.length; i++) {
//             dense[i].checkChangeTicks(change_tick);
//         }
//     }

//     clear() {
//         this.#resources.clear();
//     }

//     iter(): Iterator<[ComponentId, ResourceData<Resource>]> {
//         return this.#resources.iter();
//     }

//     get<R extends Resource>(component_id: ComponentId): Option<ResourceData<R>> {
//         return this.#resources.get(component_id) as Option<ResourceData<R>>
//     }

//     getMut<R extends Resource>(component_id: ComponentId): Option<ResourceData<R>> {
//         return this.#resources.getMut(component_id) as Option<ResourceData<R>>
//     }

//     /**
//      *
//      *  @description
//      * Fetches or initializes a new resource and returns back it's underlying column.
//      * @throws Will Error if `component_id` is not valid for the provided `components`
//      */
//     __initializeWith<R extends Resource>(component_id: ComponentId, components: Components, f: () => ArchetypeComponentId): ResourceData<R> {
//         return this.#resources.getOrSetWith(component_id, () => {
//             const component_info = components.getInfo(component_id)!;
//             return new ResourceData(
//                 f(),
//                 component_info.type,
//                 component_info.name,
//                 0,
//                 0,
//             )
//         }) as ResourceData<R>;
//     }
// }