import type { ComponentsRegistrator, StorageType } from "../component";

type EntityWorldMut = unknown;
type ComponentId = number;

export type Bundle<Effect extends BundleEffect = BundleEffect> = DynamicBundle<Effect> & {
    componentIds(components: ComponentsRegistrator, ids: (component_id: ComponentId) => void): void;
    getComponentIds(components: ComponentsRegistrator, ids: (component_id: ComponentId | undefined) => void): void;
};

export type BundleFromComponents<Self = any> = {
    fromComponents<T, F extends (type: T) => object>(ctx: T, func: F): Self;
}

export type DynamicBundle<Effect extends BundleEffect = BundleEffect> = {
    Effect: Effect;
    getComponents(func: (storage_type: StorageType, ptr: object) => void): Effect;
};


export type BundleEffect = {
    apply(entity: EntityWorldMut): void;
};

export type NoBundleEffect = {};