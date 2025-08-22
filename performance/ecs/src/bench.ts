import { run, bench, compact } from 'mitata';

export class Benchmark {
    #queue: Function[] = [];

    #addToQueue<T>(name: string, args: T, fn: (object: NoInfer<T>) => void) {
        this.#queue.push(() => bench(`${name} iterations=$iterations`, function* (state) {
            const object = state.get(name) as T;
            yield {
                [0]() {
                    return object;
                },
                bench: fn
            }
        }).range('iterations', 1, 1_000_000, 100).args(name, [args])
        );
    }


    bench<T>(name: string, args: T, fn: (object: NoInfer<T>) => void) {
        this.#addToQueue(name, args, fn);
        return this;
    }

    async run() {

        compact(() => this.#queue.forEach(f => f()));

        await run({ throw: true });
    }
}