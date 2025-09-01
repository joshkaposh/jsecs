console.log('RUNTIME');
import { GetTraitDefinitions } from './trait.macro' with {type: 'macro'};
import { Basic, Class } from './example-implementors';

console.log('RUNTIME: ', Basic);
console.log('RUNTIME: ', Class.someProp, Class.opt, Class.req);

await GetTraitDefinitions();


// await GetTraitCalls();


// console.dir(output);
// console.table(output, ['provided', 'required']);