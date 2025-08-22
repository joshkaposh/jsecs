import { type AnyRecord, type Immut as MakeImmut, type Instance, type NoReadonly, type ConcreteClass, Class } from "@repo/util";
import { defineProperties, descriptorMap } from '@repo/util/descriptor';
import { u32 } from "joshkaposh-option";


/**
 * The (arbitrarily chosen) minimum number of world tick increments between `check_tick` scans.
 * 
 * Change ticks can only be scanned when systems aren't running. Thus, if the threshold is `N`,
 * the maximum is `2 * N - 1` (i.e. the world ticks `N - 1` times, then `N` times).
 * 
 * If no change is older than `u32::MAX - (2 * N - 1)` following a scan, none of their ages can
 * overflow and cause false positives.
 * (518,400,000 = 1000 ticks per frame * 144 frames per second * 3600 seconds per hour)
 */
export const CHECK_TICK_THRESHOLD = 518_400_000;

/**
 * The maximum change tick difference that won't overflow before the next `check_tick` scan.
 * 
 * Changes stop being detected once they become this old.
 */
export const MAX_CHANGE_AGE = u32.MAX - (2 * CHECK_TICK_THRESHOLD - 1);

function relativeTo(tick: number, other: number) {
    return u32.wrapping_sub(tick, other);
}

function isNewerThan(tick: number, last_run: number, this_run: number) {
    const ticks_since_insert = Math.min(relativeTo(this_run, tick), MAX_CHANGE_AGE);
    const ticks_since_system = Math.min(relativeTo(this_run, last_run), MAX_CHANGE_AGE);

    return ticks_since_system > ticks_since_insert;
}

function check(self: number, tick: number) {
    return relativeTo(tick, self) > MAX_CHANGE_AGE;
}

function checkAssign(self: number, tick: number) {
    return check(self, tick) ? relativeTo(tick, MAX_CHANGE_AGE) : self;
}

type Tick = number;

export interface Ticks {
    readonly added: Tick;
    readonly changed: Tick;
    last_run: Tick;
    this_run: Tick;
}

export function Ticks(cell: { added: Tick, changed: Tick }, last_run: Tick, this_run: Tick): Ticks {
    return {
        get added() {
            return cell.added;
        },
        get changed() {
            return cell.changed;
        },
        last_run,
        this_run
    }
}

// function Ptr<T extends AnyRecord>(target: T): T {
//     const fns = new Map();
//     return new Proxy(target, {
//         get(target, p) {
//             const value = target[p];
//             if (value instanceof Function) {
//                 const cache = fns.get(p);
//                 if (cache) {
//                     return cache;
//                 }
//                 const bound = value.bind(target);
//                 fns.set(p, bound);
//                 return bound;
//             }
//             return value;

//         },
//     });
// }

export type TicksMut = NoReadonly<Ticks>;
export function TicksMut(cell: { added: Tick, changed: Tick }, last_run: Tick, this_run: Tick): TicksMut {
    return {
        get added() {
            return cell.added;
        },
        set added(added) {
            cell.added = added;
        },
        get changed() {
            return cell.changed;
        },
        set changed(changed) {
            cell.changed = changed;
        },
        last_run,
        this_run
    }
}
export type DetectChanges<T = AnyRecord> = {
    is_added(this: Instance<T> & DetectChanges<T>): boolean;

    is_changed(this: Instance<T> & DetectChanges<T>): boolean;

    last_changed(this: Instance<T> & DetectChanges<T>): Tick;

    added(this: Instance<T> & DetectChanges<T>): Tick;
};

export type DetectChangesMut<T = AnyRecord> = DetectChanges<T> & {

    /**
     * Flags this value as having been changed.
     * 
     * Mutably accessing this object will automatically flag this value as having been changed.
     */
    set_changed(this: Instance<T> & DetectChangesMut<T>): void;

    /**
     * Flags this value as having been added.
     * 
     * It is not normally necessary to call this method.
     * The `added` tick is set when the value is first added,
     * and is not normally changed afterwards.
     * 
     * **Note**: This operation cannot be undone.
     */
    set_added(this: Instance<T> & DetectChangesMut<T>): void;

    /**
     * Manually sets the change tick recording the time when this data was last mutated.
     * 
     * # Warning
     * This is a complex and error-prone operation, primarily intended for use with rollback networking strategies.
     * If you merely want to flag this data as changed, use [`set_changed`] instead.
     * If you want to avoid triggering change detection, use [`bypassChangeDetection`] instead.
     */
    set_last_changed(this: Instance<T> & DetectChangesMut<T>, last_changed: Tick): void;

    /**
     * Manually sets the `added` tick recording the time when this data was last added.
     * 
     * # Warning
     * The caveats of [`set_last_changed`] apply. This modifies both the added and changed ticks together.
     */
    set_last_added(this: Instance<T> & DetectChangesMut<T>, last_added: Tick): void;

    /**
     * 
     * Manually bypasses change detection, allowing you to mutate the underlying value without updating the change 
     *
     * # Warning
     * This is a risky operation, that can have unexpected consequences on any system relying on this code.
     * However, it can be an essential escape hatch when, for example,
     * you are trying to synchronize representations using change detection and need to avoid infinite recursion.
     */
    bypassChangeDetection(this: Instance<T> & DetectChangesMut<T>): Instance<T>;

    // setIfNeq(this: Instance<T> & DetectChangesMut<T>,value:  Instance<T>): boolean;
}

type DetectChangesInstance<Type = any> = {
    value: MakeImmut<Instance<Type>>;
    ticks: Ticks;
};

type DetectChangesInstanceMut<Type = any> = {
    value: Instance<Type>;
    ticks: TicksMut;
};

function is_added(ticks: Ticks): boolean {
    return isNewerThan(ticks.added, ticks.last_run, ticks.this_run);
}

function is_changed(ticks: Ticks): boolean {
    return isNewerThan(ticks.changed, ticks.last_run, ticks.this_run);
}

function set_changed(ticks: TicksMut): void {
    ticks.changed = ticks.this_run;
}

function set_added(ticks: TicksMut): void {
    const t = ticks;
    t.changed = t.this_run;
    t.added = t.this_run;
}

function set_last_changed(ticks: TicksMut, last_changed: Tick): void {
    ticks.changed = last_changed;
}

function set_last_added(ticks: TicksMut, last_added: Tick): void {
    ticks.added = last_added;
    ticks.changed = last_added;
}

export function DetectChanges<T extends ConcreteClass<DetectChangesInstance>>(constructor: T) {
    return class extends constructor implements DetectChanges<T> {
        constructor(...args: any[]) {
            super(...args);
        }

        read(this: InstanceType<T> & DetectChanges<T>) {
            return this.value;
        }

        is_added(this: InstanceType<T> & DetectChanges<T>): boolean {
            const { added, last_run, this_run } = this.ticks;
            return isNewerThan(added, last_run, this_run);
        }

        is_changed(this: InstanceType<T> & DetectChanges<T>): boolean {
            const { changed, last_run, this_run } = this.ticks;
            return isNewerThan(changed, last_run, this_run);
        }

        last_changed(this: InstanceType<T> & DetectChanges<T>): Tick {
            return this.ticks.changed;
        }

        added(this: InstanceType<T> & DetectChanges<T>): Tick {
            return this.ticks.added;
        }
    }
}

export function DetectChangesMut<T extends ConcreteClass<DetectChangesInstanceMut>>(constructor: T) {
    return class extends constructor {
        constructor(...args: any[]) {
            super(...args);
        }

        read(this: InstanceType<T> & DetectChanges<T>) {
            return this.value;
        }

        write(this: InstanceType<T> & DetectChangesMut<T>) {
            this.set_changed();
            return this.value;
        }

        is_added(this: InstanceType<T> & DetectChanges<T>): boolean {
            const { added, last_run, this_run } = this.ticks;
            return isNewerThan(added, last_run, this_run);
        }

        is_changed(this: InstanceType<T> & DetectChanges<T>): boolean {
            const { changed, last_run, this_run } = this.ticks;
            return isNewerThan(changed, last_run, this_run);
        }

        last_changed(this: InstanceType<T> & DetectChanges<T>): Tick {
            return this.ticks.changed;
        }

        added(this: InstanceType<T> & DetectChanges<T>): Tick {
            return this.ticks.added;
        }

        set_changed(this: InstanceType<T> & DetectChanges<T> & { set_changed(this: Instance<T> & DetectChanges<T> & any): void; set_added(this: Instance<T> & DetectChanges<T> & any): void; set_last_changed(this: Instance<T> & DetectChanges<T> & any, last_changed: Tick): void; set_last_added(this: Instance<T> & DetectChanges<T> & any, last_changed: Tick): void; bypassChangeDetection(this: Instance<T> & DetectChanges<T> & any): Instance<T>; }): void {
            this.ticks.changed = this.ticks.this_run;
        }

        set_added(this: InstanceType<T> & DetectChangesMut<T>): void {
            const t = this.ticks;
            t.changed = t.this_run;
            t.added = t.this_run;
        }

        set_last_changed(this: InstanceType<T> & DetectChangesMut<T>, last_changed: Tick): void {
            this.ticks.changed = last_changed;
        }

        set_last_added(this: InstanceType<T> & DetectChangesMut<T>, last_added: Tick): void {
            const t = this.ticks;
            t.added = last_added;
            t.changed = last_added;
        }

        bypassChangeDetection(this: InstanceType<T> & DetectChangesMut<T>): InstanceType<T> {
            return this.value as InstanceType<T>;
        }
    }


    // return class extends constructor {
    //     constructor(...args: any[]) {
    //         super(...args);
    //     }

    // }
}

export function InteriorMutability(target: any, key: string, descriptor: PropertyDescriptor) {
    const originalGet = descriptor.get;
    const originalSet = descriptor.set;

    if (originalGet) {
        descriptor.get = function (...args: any[]) {
            return originalGet.apply(this, args);
        }
    }

    if (originalSet) {
        descriptor.set = function (value: any) {
            originalSet.call(this, value);
        }
    }

    return descriptor;
}


type ReadWrite<T extends ConcreteClass> = ConcreteClass<InstanceType<T> & { get read(): InstanceType<T>; get write(): InstanceType<T>; }, ConstructorParameters<T>>;

export function DetectChangesMutFast<T extends ConcreteClass<DetectChangesInstanceMut>>(constructor: T): T & ReadWrite<T> {
    const proto = constructor.prototype as DetectChangesInstanceMut;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (!descriptor) {
        console.error(`DetectChangesMutFast called on a Class that does not have a value property. Object properties are: ${JSON.stringify(Object.getOwnPropertyNames(proto))}`)
        return undefined as any;
    }

    const originalGet = descriptor.get;
    if (originalGet) {
        const value = function () {
            return originalGet.call(this);
        };
        const ticks = () => proto.ticks;

        Object.defineProperty(proto, 'read', {
            get() {
                return value();
            },
        });

        Object.defineProperty(proto, 'write', {
            get() {
                set_changed(ticks());
                return value();
            },
        });

    }
    // const value = () => proto.value;
    // const ticks = () => proto.ticks;

    // Object.defineProperty(proto, 'read', {
    //     get() {
    //         return value();
    //     },
    // });

    // Object.defineProperty(proto, 'write', {
    //     get() {
    //         set_changed(ticks());
    //         return value();
    //     },
    // });

    return constructor as T & ReadWrite<T>;

    // Object.defineProperty(proto, 'value', {
    //     get() {
    //         console.log(this);
    //         return 'himom';
    //     },

    //     set(v) {

    //     },
    // })
}


@DetectChanges
export class Res<T> {
    readonly #value: MakeImmut<Instance<T>>;
    readonly #ticks: Ticks;
    constructor(value: Instance<T>, ticks: Ticks) {
        this.#value = value as MakeImmut<Instance<T>>;
        this.#ticks = ticks;
    }

    get value() {
        return this.#value;
    }

    get ticks() {
        return this.#ticks
    }

    clone() {
        return new Res(this.#value as Instance<T>, structuredClone(this.#ticks));
    }
}

@DetectChangesMut
export class ResMut<T> {
    #value: Instance<T>;
    #ticks: TicksMut;
    constructor(value: Instance<T>, ticks: TicksMut) {
        this.#value = value;
        this.#ticks = ticks;
    }

    get value() {
        return this.#value;
    }

    get ticks() {
        return this.#ticks;
    }
}

/**
 * Shared borrow of an entity's component with access to change detection.
 * Similar to [`Mut`] but is immutable and so doesn't require unique access.
 */
@DetectChanges
export class Ref<T> {
    #value: MakeImmut<Instance<T>>;
    #ticks: Ticks;

    constructor(
        value: Instance<T>,
        ticks: Ticks
    ) {
        this.#value = value as MakeImmut<Instance<T>>;
        this.#ticks = ticks;
    }

    static from(instance: DetectChangesInstance | DetectChangesInstanceMut) {
        return new Ref(instance.value as AnyRecord, instance.ticks);
    }


    map<U>(f: (value: MakeImmut<Instance<T>>) => MakeImmut<Instance<U>>): Ref<U> {
        return new Ref(f(this.#value) as Instance<U>, this.#ticks);
    }

    setTicks(last_run: Tick, this_run: Tick) {
        this.#ticks.last_run = last_run;
        this.#ticks.this_run = this_run;
    }

    get value() {
        return this.#value
    }

    get ticks() {
        return this.#ticks
    }
}

/**
 * Unique mutable borrow of an entity's component or of a resource.
 */
@DetectChangesMut
export class Mut<T> {
    #value: Instance<T>;
    #ticks: TicksMut;

    constructor(value: Instance<T>, ticks: TicksMut) {
        this.#value = value;
        this.#ticks = ticks;
    }

    static new<T>(value: Instance<T>, added: Tick, last_changed: Tick, last_run: Tick, this_run: Tick): Mut<T> {
        return new Mut(value, {
            added,
            changed: last_changed,
            last_run,
            this_run
        });
    }

    static from(instance: DetectChangesInstance | DetectChangesInstanceMut) {
        return new Mut(instance.value as AnyRecord, instance.ticks);
    }

    get value() {
        return this.#value;
    }

    get ticks() {
        return this.#ticks;
    }

    setTicks(last_run: Tick, this_run: Tick) {
        const t = this.#ticks;
        t.last_run = last_run;
        t.this_run = this_run;
    }
}

@DetectChangesMutFast
export class MutFast<T> {
    #value: Instance<T>;
    ticks: TicksMut;

    constructor(value: Instance<T>, ticks: TicksMut) {
        this.#value = value;
        this.ticks = ticks;
    }

    static new<T>(value: Instance<T>, added: Tick, last_changed: Tick, last_run: Tick, this_run: Tick): MutFast<T> {
        return new MutFast(value, {
            added,
            changed: last_changed,
            last_run,
            this_run
        });
    }

    static from(instance: DetectChangesInstance | DetectChangesInstanceMut) {
        return new MutFast(instance.value as AnyRecord, instance.ticks);
    }

    get value() {
        return this.#value;
    }

    setTicks(last_run: Tick, this_run: Tick) {
        const t = this.ticks;
        t.last_run = last_run;
        t.this_run = this_run;
    }
}

export class MutUntyped implements DetectChangesMut {
    #value: AnyRecord;
    #ticks: TicksMut;

    constructor(value: AnyRecord, ticks: TicksMut) {
        this.#value = value;
        this.#ticks = ticks;
    }

    static new(value: AnyRecord, added: Tick, last_changed: Tick, last_run: Tick, this_run: Tick): MutUntyped {
        return new MutUntyped(value, {
            added,
            changed: last_changed,
            last_run,
            this_run
        });
    }

    static from(instance: DetectChangesInstance) {
        return new MutUntyped(instance.value, instance.ticks);
    }

    get value() {
        return this.#value;
    }

    get ticks() {
        return this.#ticks;
    }

    intoInner() {
        this.set_changed();
        return this.#value;
    }

    hasChangedSince(tick: Tick) {
        const t = this.#ticks;
        return isNewerThan(t.changed, tick, t.this_run);
    }

    asMut() {
        return this.intoInner();
    }

    asRef(): MakeImmut<AnyRecord> {
        return this.#value;
    }

    mapUnchanged<T>(f: (ptr: AnyRecord) => Instance<T>) {
        return new Mut(f(this.#value), this.#ticks)
    }

    withType<T>() {
        return new Mut(this.#value as Instance<T>, this.#ticks);
    }

    is_added(): boolean {
        const t = this.#ticks;
        return isNewerThan(t.added, t.last_run, t.this_run);
    }

    is_changed(): boolean {
        const t = this.#ticks;
        return isNewerThan(t.changed, t.last_run, t.this_run);
    }

    last_changed(): Tick {
        return this.#ticks.changed;
    }

    added(): Tick {
        return this.#ticks.added;
    }

    set_changed(): void {
        const t = this.#ticks;
        t.changed = t.this_run;
    }

    set_added(): void {
        const t = this.#ticks;
        t.changed = t.this_run;
        t.added = t.this_run;
    }

    set_last_changed(): void {
        const t = this.#ticks;
        t.changed = t.this_run;
    }

    set_last_added(last_added: Tick): void {
        const t = this.#ticks;
        t.changed = last_added;
        t.added = last_added;
    }

    bypassChangeDetection() {
        return this.#value;
    }

}

