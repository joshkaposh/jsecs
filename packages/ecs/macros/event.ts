type Event<T> = T;

export function Event<C extends abstract new (...args: any[]) => any>(target: C): Event<C> {
    return undefined as unknown as Event<C>;
}