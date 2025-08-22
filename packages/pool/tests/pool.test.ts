import { test, expect, } from 'bun:test';
import { assert } from '@repo/test-helpers';
import { Pool } from "@repo/pool";
import { TypeId } from '@repo/util/type-id';
import { addMixin, derive } from '@repo/util/mixin';

class MyComponent { }

function config() {
    return {
        create: () => new MyComponent()
    }
}

function assert_len_cap(pool: Pool<any>, len: number, cap: number) {
    assert(pool.length() === len, `pool length ${pool.length()} does not equal ${len}`);
    assert(pool.capacity() === cap, `pool capacity ${pool.capacity()} does not equal ${cap}`);
}

function get<T>(pool: Pool<T>, n: number) {
    return Array.from({ length: n }, () => pool.acquire())
}


const Comp = derive(class Comp { }, TypeId);

class MyTest {
    static readonly prop1 = 10;
    prop2 = false;
}

test('mixin', () => {
    const testmix = derive(MyTest, TypeId, function (target) {
        addMixin(target.prototype, {
            instanceProp: 5
        });
    });

    testmix.prop1;
    testmix.type_id;

    assert(testmix.type_id != null && typeof testmix.type_id === 'string');

    const t = new testmix();

});



test('component', () => {

    console.log(Comp.type_id);
})

test('simple', () => {
    const pool = new Pool<MyComponent>(config());
    const [a] = get(pool, 4);
    pool.free(a);
    const a1 = pool.acquire();
    expect(a).toEqual(a1);
    assert(a.data === a1.data);
});

test('multiple `free`s', () => {
    const pool = new Pool<MyComponent>(config());
    const [a, b, c, d] = get(pool, 4);
    pool.free(d!);
    pool.free(a!);
    const a1 = pool.acquire();
    const a2 = pool.acquire();
    assert(a1.index !== a2.index, `a1 index ${a1.index} should not equal a2 index ${a2.index}`);

    const index = b!.index;
    pool.free(b!);
    const b1 = pool.acquire();
    assert(b1.index === index);
    pool.free(b1);
    assert(pool.acquire().index === index);

    assert(pool.acquire().index !== c!.index);
});

test('makeContiguous', () => {
    const pool = new Pool<MyComponent>(config());

    get(pool, 10);



})