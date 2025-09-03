import { applyProperties, TypeId } from "@repo/util";
import type { Resource as ResourceType } from "../src/component";

export function Resource<T extends abstract new (...args: any[]) => any>(target: T): ResourceType<T> {
    // applyProperties({ MUTABLE: true })(target);
    // return TypeId(target) as ResourceType<T>;
    // return cast()
    return undefined as unknown as ResourceType<T>;
}


// export function Resource<C extends new (...args: any[]) => any>(target: C): ResourceType<C> {
//     return undefined as unknown as ResourceType<C>;
// }