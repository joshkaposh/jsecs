
import { TypeId } from '@repo/util' with {type: 'macro'};

import { Component } from './component';

function testMacro(ctor: any, ctx: ClassDecoratorContext) {
    console.log(ctor.type_id);
    return;
}

@Component
class MyClass {
    static type_id = TypeId();
}


console.log(MyClass.type_id);