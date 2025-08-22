import { test, expect } from 'bun:test';
import { assert } from '@repo/test';
import { Component, entities } from '@ecs/core/define';
import * as _symbol_dot_meta_polyfill from "@repo/util/symbol-polyfill"

function assertEnumerable(object: object, ...keys: PropertyKey[]) {
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        assert(key in object, `Key: ${String(key)} was not found in object ${JSON.stringify(object)}`);
    }
}

function assertEntries(object: object, entries: [PropertyKey, unknown][]) {
    for (let i = 0, l = entries.length; i < l; i++) {
        const [key, value] = entries[i];
        assert(key in object, `Key: ${String(key)} was not found in object ${JSON.stringify(object)}`);
        expect(object[key]).toEqual(value);
    }
}

test('Component', () => {
    @Component
    class BasicComponent { }
    assertEnumerable(BasicComponent, 'storage_type', 'MUTABLE');
    assertEntries(BasicComponent, [['storage_type', 0], ['MUTABLE', true]])

    //     @Component({
    //         storage_type: 1,
    //         MUTABLE: false
    //     })
    //     class MyComponent { }
    //     assertEnumerable(MyComponent, 'storage_type', 'MUTABLE');
    //     assertEntries(MyComponent, [['storage_type', 1], ['MUTABLE', false]])
});

// test('Dynamic Component', () => {
//     const Dynamic = Component(class Dynamic { });
//     assertEnumerable(Dynamic, 'storage_type', 'MUTABLE');
//     assertEntries(Dynamic, [['storage_type', 0], ['MUTABLE', true]])

//     const Configured = Component(class Configured { }, { storage_type: 1, MUTABLE: false });
//     assertEnumerable(Configured, 'storage_type', 'MUTABLE');
//     assertEntries(Configured, [['storage_type', 1], ['MUTABLE', false]]);
// });

// test('derive entities', () => {
//     @Component
//     class ContainsEntities {
//         @entities
//         owner: Entity
//     }
// });


// function runBench(fn: Function) {
//     const now = Bun.nanoseconds();
//     fn();
//     return (Bun.nanoseconds() - now) / 1e+6;
// }

// function bench(fn: Function, iterations: number) {
//     const times: number[] = new Array(iterations);

//     for (let i = 0; i < iterations; i++) {
//         times[i] = runBench(fn);
//     }

//     const total_ms = times.reduce((acc, x) => acc += x);
//     const average_ms = total_ms / iterations;
//     return {
//         total_ms: total_ms,
//         average_ms: average_ms
//     }
// }



class Wrapped<T> {
    value: T;
    constructor(value: T) {
        this.value = value;
    }

}

class WrappedGetter<T> {
    #value: T;
    constructor(value: T) {
        this.#value = value;
    }

    get value() {
        return this.#value;
    }
}

class WrappedRead<T> {
    #value: T;
    constructor(value: T) {
        this.#value = value;
    }

    read() {
        return this.#value;
    }
}

class SomeClass {
    property = 'himom';
    method() {
        this.#privateMethod();

    }

    #privateMethod() { }
}

// function testIterations<T extends AnyRecord>(object: T, fn: (object: T) => void) {
//     return bench(() => fn(object), 2_000_000);
// }

// console.log('Normal: ', testIterations(new SomeClass(), (o) => o.property));

// console.log('WrappedObject', testIterations({ value: new SomeClass() }, (o) => o.value.property));
// console.log('WrappedObjectGetter', testIterations({ value: new SomeClass() }, (o) => o.value.property));
// console.log('WrappedObjectRead', testIterations({ value: new SomeClass() }, (o) => o.value.property));

// console.log('WrappedClass: ', testIterations(new Wrapped(new SomeClass()), (o) => o.value.property));
// console.log("WrappedClassGetter", testIterations(new WrappedGetter(new SomeClass()), (o) => o.value.property));
// console.log("WrappedClassRead", testIterations(new WrappedRead(new SomeClass()), (o) => o.read().property));

