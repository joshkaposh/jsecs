import { GetTraits } from './trait.macro' with {type: 'macro'};
// import { transpile } from './transpile';

const output = await GetTraits(false, 'dev/example-trait.trait.ts');
console.dir(output);
// console.table(output, ['provided', 'required']);