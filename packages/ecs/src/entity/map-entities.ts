import type { Entity } from "./entity";

export type EntityMapper = {
    getMapped(source: Entity): Entity;
    setMapped(source: Entity, target: Entity): void;
};

export type MapEntities = {
    mapEntities<E extends EntityMapper>(entity_mapper: E): void;
};