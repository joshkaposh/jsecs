import type { ArchetypeId } from "../archetype";
import type { Entity } from "../entity";

export const QueryEntityError = {
    QueryDoesNotMatch(entity: Entity, archetype_id: ArchetypeId) {
        return {
            type: 'QueryDoesNotMatch',
            data: { entity, archetype_id }
        }
    },
    EntityDoesNotExist(error: string) {
        return {
            type: 'EntityDoesNotExist',
            data: { details: error },
        }
    },
    AliasedMutability(entity: Entity) {
        return {
            type: 'AliasedMutability',
            data: { entity }
        }
    }
} as const;

export const QuerySingleError = {

    NoEntities(name: string) {
        return {
            type: 'NoEntities',
            data: name
        }
    },
    MultipleEntities(name: string) {
        return {
            type: 'MultipleEntities',
            data: name
        }
    }
} as const;