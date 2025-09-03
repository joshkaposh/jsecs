import { type Component as ComponentType } from "../src/component";

// @ts-expect-error
export function Component<T extends new (...args: any[]) => any>(target: T): ComponentType<T> {
    return undefined as unknown as ComponentType<T>;
}