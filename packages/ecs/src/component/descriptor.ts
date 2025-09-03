import type { UUID } from "@repo/util";
import { ComponentCloneBehavior } from "./clone";
import type { Component, Resource } from "./define";

type DropFn = (instance: any) => void;
type DebugName = string;
type StorageType = 0 | 1;
const StorageTypeTable = 0;

const DefaultComponentCloneBehavior: ComponentCloneBehavior = ComponentCloneBehavior.Default;

export class ComponentDescriptor {
    readonly name: DebugName;

    readonly storage_type: StorageType;

    readonly is_send_and_sync: boolean;

    readonly type_id: UUID | undefined;

    readonly drop: DropFn | undefined;
    readonly mutable: boolean;

    readonly clone_behavior: ComponentCloneBehavior;

    type?: any;

    constructor(name: string,
        storage_type: StorageType,
        is_send_and_sync: boolean,
        type_id: UUID,
        drop: DropFn | undefined,
        mutable: boolean,
        clone_behavior: ComponentCloneBehavior,
        type?: any
    ) {
        this.name = name;
        this.storage_type = storage_type;
        this.is_send_and_sync = is_send_and_sync;
        this.type_id = type_id;
        this.drop = drop;
        this.mutable = mutable;
        this.clone_behavior = clone_behavior;
        this.type = type;
    }

    static newComponent(type: Component) {
        return new ComponentDescriptor(
            type.name,
            type.storage_type,
            true,
            type.type_id,
            undefined,
            // needs_drop(type) ? ComponentDescriptor.drop_ptr().bind(type) : undefined,
            type.MUTABLE,
            type.cloneBehavior(),
        );
    }

    static newResource(type: Resource) {
        return new ComponentDescriptor(
            type.name,
            StorageTypeTable,
            true,
            type.type_id,
            undefined,
            // needs_drop(type) ? ComponentDescriptor.drop_ptr().bind(type) : undefined,
            type.MUTABLE,
            DefaultComponentCloneBehavior,
            type
        );
    }

    [Symbol.toPrimitive]() {
        return `ComponentDescriptor {
            name: ${this.name};
            storage_type: ${this.storage_type};
            is_send_and_sync: ${this.is_send_and_sync};
            type_id: ${this.type_id};
            mutable: ${this.mutable};
            clone_behavior: ${this.clone_behavior};
        }`
    }
}