import { u32 } from "joshkaposh-option";

export type Tick = number;
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

export interface ComponentTicks {
    added: Tick;
    changed: Tick;
}

export type Ticks = ComponentTicks & {
    last_run: Tick;
    this_run: Tick;
}

export function relativeTo(tick: number, other: number) {
    return u32.wrapping_sub(tick, other);
}

export function isNewerThan(tick: number, last_run: number, this_run: number) {
    const ticks_since_insert = Math.min(relativeTo(this_run, tick), MAX_CHANGE_AGE);
    const ticks_since_system = Math.min(relativeTo(this_run, last_run), MAX_CHANGE_AGE);

    return ticks_since_system > ticks_since_insert;
}

export function isAdded(added: Tick, last_run: Tick, this_run: Tick): boolean {
    return isNewerThan(added, last_run, this_run);
}

export function isChanged(ticks: Ticks): boolean {
    return isNewerThan(ticks.changed, ticks.last_run, ticks.this_run);
}

export function checkTick(self: number, tick: number) {
    return relativeTo(tick, self) > MAX_CHANGE_AGE;
}

export function checkTicksNumber(self: number, tick: number) {
    return checkTick(self, tick) ?
        relativeTo(tick, MAX_CHANGE_AGE) :
        self

}

export function checkTicks(self: ComponentTicks, tick: number) {
    if (checkTick(self.added, tick)) {
        self.added = relativeTo(tick, MAX_CHANGE_AGE);
    }

    if (checkTick(self.changed, tick)) {
        self.changed = relativeTo(tick, MAX_CHANGE_AGE);
    }

}
