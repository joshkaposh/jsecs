/**
 * 
 * @param obj 
 * @returns 
 */
export function take<T extends any>(obj: T): T {
    const ty = typeof obj;

    if (obj == null || ty === 'function' || ty !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.splice(0, obj.length) as T;
    } else if (obj instanceof Set) {
        const set = new Set(...obj) as T;
        obj.clear();
        return set;

    } else if (obj instanceof Map) {
        const map = new Map(...obj.entries()) as T;
        obj.clear();
        return map;
    } else if (typeof obj === 'object' && 'take' in obj && typeof obj.take === 'function') {
        return obj.take() as T;
    }

    throw new Error(`Could not perform the \`take\` operation on (type = ${ty}, value = ${obj})`)
}