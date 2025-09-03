import { SimpleTrait } from './example-trait.trait';

export const Basic = SimpleTrait({
    someProp: 'someValue'
}, {
    req() {
        this.someProp;
        this.req();
        this.opt();
    }
});

export const Class = SimpleTrait(class SomeClass {
    someProperty = 'himom';
}, {
    req() {
        this.opt();
    },
});

// Class