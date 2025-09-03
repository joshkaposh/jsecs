export class ComponentIds {
    #next: number;

    constructor(next = 0) {
        this.#next = next;
    }

    peek() {
        return this.#next;
    }

    next() {
        const n = this.#next;
        this.#next += 1;
        return n
    }

    len() {
        return this.peek();
    }

    is_empty() {
        return this.len() === 0;
    }
}