import { mergeObjects, swap, type PickNumber, type ToArray } from '@repo/util';
import { run, bench, compact, B } from 'mitata';

export type BenchmarkOptions = {
    /** defaults to `"join"` */
    output: 'divide' | 'join',
    iterations: {
        /** defaults to `1` */
        start: number
        /** defaults to `1_000_000` */
        end: number,
        /** defaults to `100` */
        multiplier: number;
    },
};

function sanitize(options: BenchmarkOptions) {
    const it = options.iterations;
    if (it.end < it.start) {
        swap(it, 'start', 'end');
    }

    it.multiplier = Math.abs(it.multiplier);
}

// type ComputedArguments<T extends Record<any, () => any>> = {
//     [K in keyof T as PickNumber<K>]: T[K];
// }

type ComputedArgumentRecord<Args extends readonly any[] = any[]> = Record<number | `${number}`, (args: Args[number]) => any>;

type GetComputedArguments<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : T[K];
}

type Input<
    Args extends readonly any[] = any[],
    ComputedArgs extends ComputedArgumentRecord<Args> = ComputedArgumentRecord<Args>
> = {
    name: string;
    args: Args;
    computed: ComputedArgs;
    bench: (...args: ToArray<GetComputedArguments<ComputedArgs>>) => any;
};

// type Solution = ComputedArguments<{
//     0: () => 'himom'
// }>;

type Solution2 = ToArray<{
    0: () => () => string;
    1: () => () => string;
}>;



type Solution3 = ToArray<GetComputedArguments<{ [0](): string;[1](): number }>>;

type ComputedBenchmark = {}

export class Benchmark {
    #queue: (() => void)[] = [];
    #options: BenchmarkOptions;
    constructor(options?: Partial<BenchmarkOptions>) {

        options = mergeObjects<BenchmarkOptions>({
            output: 'join',
            iterations: {
                start: 1,
                end: 1_000_000,
                multiplier: 100
            }
        }, options ?? Object.create(null));

        sanitize(options as BenchmarkOptions);

        this.#options = options as BenchmarkOptions;

    }

    #addToQueue<T>(name: string, args: T, fn: (object: NoInfer<T>) => void) {
        const queue = this.#queue,
            options = this.#options.iterations;

        queue.push(() => bench(`${name} iterations=$iterations`, function* (state: any) {
            const object = state.get(name) as T;
            yield {
                [0]() {
                    return object;
                },
                bench: fn
            }
        }).range('iterations', options.start, options.end, options.multiplier).args(name, [args])
        );
    }

    addComputed<Args extends any[], ComputedArgs extends ComputedArgumentRecord<Args>>(
        name: string,
        args: Args,
        computed: ComputedArgs,
        fn: (...args: ToArray<ComputedArgs>) => any
    ) {
        const bench_fn = () => bench(name, function* (state: any) {
            const args = state.get(name);

            const context = {
                // bench: bench_fn   
            };
            yield
        });


    }

    addWithIterations(name: number, iterations: number | number[], fn: () => any) {
        iterations = typeof iterations === 'number' ? [iterations] : iterations;

        bench(`${name} (iterations = $size)`, function* (state: any) {
            const size = state.get('size');

            yield {
                [0]() { },
                bench() { }
            }
        })
    }

    // addComputed<T>(name: string, fn: () => any) {
    //     this.#queue.push(() => {
    //         bench(name, function* (state: any) {
    //             const keys = state.get(name) as T;

    //         })
    //     })
    // }

    add<T>(name: string, args: T, fn: (object: NoInfer<T>) => void) {
        this.#addToQueue(name, args, fn);
        return this;
    }

    remove(benchmark: string): boolean {
        const index = this.#queue.findIndex(v => v.name === benchmark);
        if (index !== -1) {
            this.#queue.splice(index, 1);
            return true;
        }

        return false;
    }

    async run() {
        const output = this.#options.output;

        if (output === 'join') {
            compact(() => this.#queue.forEach(f => f()));
        } else {
            this.#queue.forEach(f => compact(f));
        }

        await run({ throw: true });
    }
}