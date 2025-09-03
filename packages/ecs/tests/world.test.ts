import { test } from 'bun:test';
// import { assert } from '@repo/test';

// import { } from '../src/world/world';
import { Component } from '../src/component';

test('world registerComponent', () => {
    const Comp = Component(class MyComponent { });
    // const Comp2 = Component(class MyComponent2 { });

    // const w = World.new();
    // assert(w.registerComponent(Comp) !== w.registerComponent(Comp2));
});