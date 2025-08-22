export function ObjectDefault() {
    return {
        otherMethod() { },
        method() {
            this.otherMethod();
        },
        property: 'himom'
    }
}

export function ObjectWrapped() {
    const inner = {
        otherMethod() { },
        method() {
            this.otherMethod();
        },
        property: 'himom'
    };
    return {
        value: inner
    }
}


export function ObjectWrappedGetter() {
    const inner = {
        otherMethod() { },
        method() {
            this.otherMethod();
        },
        property: 'himom'
    };
    return {
        get value() {
            return inner;
        }
    }
}

export function ObjectWrappedRead() {
    const inner = {
        otherMethod() { },
        method() {
            this.otherMethod();
        },
        property: 'himom'
    };
    return {
        read() {
            return inner;
        }
    }
}

export class SomeClass {
    property = 'himom';
    method() {
        this.#privateMethod();

    }

    #privateMethod() { }
}

export class Wrapped<T> {
    value: T;
    constructor(value: T) {
        this.value = value;
    }

}

export class WrappedGetter<T> {
    #value: T;
    constructor(value: T) {
        this.#value = value;
    }

    get value() {
        return this.#value;
    }
}

export class WrappedRead<T> {
    #value: T;
    constructor(value: T) {
        this.#value = value;
    }

    read() {
        return this.#value;
    }
}
