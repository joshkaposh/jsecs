import type { World } from "./world";

export class DeferredWorld {
    #world: World;
    constructor(world: World) {
        this.#world = world;
    }
}