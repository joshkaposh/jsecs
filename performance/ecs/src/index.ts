import { do_not_optimize } from 'mitata';
import { SomeClass, Wrapped, WrappedGetter, WrappedRead, ObjectDefault, ObjectWrapped, ObjectWrappedGetter, ObjectWrappedRead } from './objects';
import { Benchmark } from './bench';
import { Mut, MutFast, MutUntyped, Ref, Res, ResMut } from './change-detection';

function wrappers(b: Benchmark) {
    return b.bench('class:default', new SomeClass(), (o) => {
        do_not_optimize(o.method());
        do_not_optimize(o.property);
    })
        .bench('class:wrapped', new Wrapped(new SomeClass()), o => {
            do_not_optimize(o.value.method());
            do_not_optimize(o.value.property);
        })
        .bench('class:wrapped_getter', new WrappedGetter(new SomeClass()), o => {
            do_not_optimize(o.value.method());
            do_not_optimize(o.value.property);
        })
        .bench('class:wrapped_read', new WrappedRead(new SomeClass()), o => {
            do_not_optimize(o.read().method());
            do_not_optimize(o.read().property);
        })
        .bench('object:default', ObjectDefault(), (o) => {
            do_not_optimize(o.method());
            do_not_optimize(o.property);
        })
        .bench('object:wrapped', ObjectWrapped(), (o) => {
            do_not_optimize(o.value.method());
            do_not_optimize(o.value.property);
        })
        .bench('object:wrapped_getter', ObjectWrappedGetter(), (o) => {
            do_not_optimize(o.value.method());
            do_not_optimize(o.value.property);
        })
        .bench('object:wrapped_read', ObjectWrappedRead(), (o) => {
            do_not_optimize(o.read().method());
            do_not_optimize(o.read().property);
        })

}

function change_detection(b: Benchmark) {
    return b
        .bench('MutFast', new MutFast({ x: 0, y: 0 }, { added: 5, changed: 5, this_run: 20, last_run: 20 }), (res) => {
            do_not_optimize(res.value.x += res.value.y);
        })
    // .bench('Ref', new Ref({ x: 0, y: 0 }, { added: 5, changed: 5, this_run: 20, last_run: 20 }), (res) => {
    //     do_not_optimize(res.value.x += res.value.y);
    // })
    // .bench('Mut', new Mut({ x: 0, y: 0 }, { added: 5, changed: 5, this_run: 20, last_run: 20 }), (res) => {
    //     do_not_optimize(res.value.x += res.value.y);
    // })
    // .bench('Res', new Res({ x: 0, y: 0 }, { added: 5, changed: 5, this_run: 20, last_run: 20 }), (res) => {
    //     do_not_optimize(res.value.x + res.value.y);
    // })
    // .bench('ResMut', new ResMut({ x: 0, y: 0 }, { added: 5, changed: 5, this_run: 20, last_run: 20 }), (res) => {
    //     do_not_optimize(res.value.x += res.value.y);
    // })

    // .bench('MutUntyped', new MutUntyped({ x: 0, y: 0 }, { added: 5, changed: 5, this_run: 20, last_run: 20 }), (res) => {
    //     do_not_optimize(res.value.x += res.value.y);
    // })
}

const m = new MutFast({ property: 'himom' }, { added: 0, changed: 0, last_run: 1, this_run: 2 });

console.log(m.value);
// console.log(m.read);
// console.log(m.write);




// const benchmark = new Benchmark();
// change_detection(benchmark);
// await benchmark.run();

