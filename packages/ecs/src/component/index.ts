import type { World } from '../world';
import type { Component, ComponentId } from './define';

export * from './storage-type'

export * from './tick';

export * from './info';
export * from './register';
export * from './required';

export * from './define';

// type InitComponentId<T> = any;
type Local<T> = any;

export class ComponentIdFor {
    #local: Local<InitComponentId>;
    get v() {
        return this.#local.v.v;
    }
}

function SystemParam(target: any) { }

@SystemParam
class InitComponentId {
    readonly component_id: ComponentId;
    constructor(component_id: ComponentId) {
        this.component_id = component_id;
    }

    static from_world<T extends Component>(this: T, world: World) {
        const self = this;
        return new InitComponentId(
            world.registerComponent(self)
        );
    }
}