
/**
 * Appends a new element to the Set.
 * @returns true if this was a new insertion.
 */
export function insert<T>(set: Set<T>, value: NoInfer<T>) {
    const seen = !set.has(value);
    set.add(value);
    return seen;
}