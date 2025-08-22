/**
 * @description
 * `entry` takes three arguments: a `Map<K, V>, a key `K` and a optional closure returning a value if no key was found.
 * 
 * If no provided closure was passed, `entry` performs like a `Map::get(key)` call
@returns `V` in Map if one was found, or `V` from closure
*/
export function entry<K, V>(map: Map<K, V>, key: K): V | undefined
export function entry<K, V>(map: Map<K, V>, key: K, fn: () => V): V;
export function entry<K, V>(map: Map<K, V>, key: K, fn?: () => V): V | undefined {
    let value = map.get(key);
    // only insert if map doesn't have key and function exists.
    if (!map.has(key) && fn) {
        value = fn();
        map.set(key, value);
    }
    return value;
}
