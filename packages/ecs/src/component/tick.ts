import { u32 } from "joshkaposh-option";

export type Tick = number;

export namespace Tick {
    const MAX_CHANGE_AGE = 0;

    export function relativeTo(tick: number, other: number) {
        return u32.wrapping_sub(tick, other);
    }

    export function isNewerThan(tick: number, last_run: number, this_run: number) {
        const ticks_since_insert = Math.min(relativeTo(this_run, tick), MAX_CHANGE_AGE);
        const ticks_since_system = Math.min(relativeTo(this_run, last_run), MAX_CHANGE_AGE);

        return ticks_since_system > ticks_since_insert;
    }

    export function check(self: number, tick: number) {
        return relativeTo(tick, self) > MAX_CHANGE_AGE;
    }

    export function checkAssign(self: number, tick: number) {
        return check(self, tick) ? relativeTo(tick, MAX_CHANGE_AGE) : self;
    }
}

export interface ComponentTicks {
    added: Tick;
    changed: Tick;
}
