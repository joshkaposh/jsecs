import { checkTicks, type ComponentTicks, type Tick } from "../../component";
import { swap, swapPop } from "@repo/util";
import { debugAssert } from '@repo/util/assert';
import { TableRow } from "./index";

function swapRemoveUnchecked(data: any[], index_to_remove: number, index_to_keep: number) {
    debugAssert(data.length > index_to_keep, '')
    debugAssert(data.length > index_to_remove, '')

    if (index_to_remove !== index_to_keep) {
        return swapRemoveUncheckedNonoverlapping(data, index_to_remove, index_to_keep);
    } else {
        swapPop(data, index_to_remove);
    }

    return data[index_to_keep];
}

function swapRemoveUncheckedNonoverlapping(data: any[], index_to_remove: number, index_to_keep: number) {
    debugAssert(data.length > index_to_keep);
    debugAssert(data.length > index_to_remove);
    debugAssert(index_to_remove !== index_to_keep);

    swap(data, index_to_keep, index_to_remove);
    data.pop();
    return data[index_to_keep];
}

export class Column {
    data: object[];
    ticks: ComponentTicks[]

    constructor(
        data: object[] = [],
        ticks: ComponentTicks[] = []
    ) {
        this.data = data;
        this.ticks = ticks;
    }

    /**
     * Is true if no components are in this [`Column`].
     */
    get isEmpty() {
        return this.data.length === 0;
    }

    /**
     * The total amount of components in this [`Column`].
     */
    get length() {
        return this.data.length;
    }

    __push(ptr: object, ticks: ComponentTicks) {
        this.data.push(ptr);
        this.ticks.push(ticks);
    }

    getDataSlice(_len: number) {
        return this.data;
    }

    getTicksSlice(_len: number) {
        return this.ticks;
    }

    // getAddedTicksSlice(_len: number) {
    //     return this.added_ticks;
    // }

    // getChangedTicksSlice(_len: number) {
    //     return this.changed_ticks;
    // }

    get(row: TableRow): [object, ComponentTicks] | undefined {
        if (row < this.data.length) {
            return [this.data[row]!, this.ticks[row]!];
        }
    }

    getDataUnchecked(row: TableRow) {
        return this.data[row]
    }

    getData(row: TableRow): object | undefined {
        if (row < this.data.length) {
            return this.data[row]

        }
    }

    getAddedTick(row: number) {
        return this.ticks[row]?.added;
    }

    getChangedTick(row: number) {
        return this.ticks[row]?.changed;
    }

    getWithTicks(row: number): [object, ComponentTicks] | undefined {
        const d = this.getData(row);
        const t = this.getTicks(row);

        if (d) {
            return [d, t!];
        }
    }

    getTicks(row: number): ComponentTicks | undefined {
        if (row < this.data.length) {
            return this.getTicksUnchecked(row)
        }
    }

    getTicksUnchecked(row: number) {
        return this.ticks[row];
    }

    __swapRemoveUnchecked(row: TableRow): [object, ComponentTicks] | undefined {
        const d = swapPop(this.data, row);
        const t = swapPop(this.ticks, row);

        if (d) {
            return [d, t!];
        }
    }

    pop(_last_element_index: number) {
        this.data.pop();
        this.ticks.pop();
    }

    __swapRemoveAndDropUncheckedNonoverlapping(last_element_index: number, row: TableRow) {
        swapRemoveUncheckedNonoverlapping(this.data, row, last_element_index);
        swapRemoveUncheckedNonoverlapping(this.ticks, row, last_element_index);
    }

    __swapRemoveAndForgetUnchecked(last_element_index: number, row: TableRow) {
        swapRemoveUnchecked(this.data, row, last_element_index);
        swapRemoveUnchecked(this.ticks, row, last_element_index);
    }

    /**
     * Call to expand / shrink the memory allocation for this Column
     * The caller should make sure their saved capacity is updated to new_capacity after this operation
     */
    __realloc(_current_capacity: number, _new_capacity: number) {
        // realloc(this.data, current_capacity, new_capacity)
        // realloc(this.added_ticks, current_capacity, new_capacity)
        // realloc(this.changed_ticks, current_capacity, new_capacity)
    }

    __alloc(_new_capacity: number) {
        // alloc(this.data, new_capacity)
        // alloc(this.added_ticks, new_capacity)
        // alloc(this.changed_ticks, new_capacity)
    }

    /**
     * Writes component data to the column at the given row.
     * Assumes the slot in uninitialized
     * To overwrite existing initialized value, use Column.replace() instead
     */
    __initialize(row: TableRow, data: {}, change_tick: Tick) {
        this.data[row] = data;
        this.ticks[row] = { added: change_tick, changed: change_tick }
    }
    __replace(row: TableRow, data: {}, change_tick: Tick) {
        this.data[row] = data;
        const ticks = this.ticks[row]!;
        ticks.added = change_tick;
        ticks.changed = change_tick;
    }

    /**
     * Removes the element from `other` at `src_row` and inserts it
     * into the current column to initialize the values at `dst_row`
     */
    __initializeFromUnchecked(other: Column, _other_last_element_index: number, src_row: TableRow, dst_row: TableRow) {
        this.data[dst_row] = swapPop(other.data, src_row)!;
        this.ticks[dst_row] = swapPop(other.ticks, src_row)!;
    }

    checkChangeTicks(len: number, change_tick: Tick) {
        const ticks = this.ticks;
        for (let i = 0; i < len; i++) {
            const tick = ticks[i]!;
            checkTicks(tick, change_tick);
        }
    }

    clear() {
        this.data.length = 0;
        this.ticks.length = 0;
    }
    __reserveExact(_additional: number) {
        // reserve(this.data,ca additional);
    }

}