console.log('RUNTIME');
import { GenerateTraitMetadata } from './trait.macro' with {type: 'macro'};
import { Basic, Class } from './example-implementors';

console.log('RUNTIME - object: ', Basic.someProp, Basic.opt, Basic.req);
console.log('RUNTIME - class: ', Class.someProp, Class.opt, Class.req);

await GenerateTraitMetadata();

// await GetTraitCalls();


// console.dir(output);
// console.table(output, ['provided', 'required']);