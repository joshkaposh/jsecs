import { v4 } from 'uuid';
import { isObject } from './predicate';

export type UUID = `${string}-${string}-${string}-${string}`;

export type TypeId = {
    readonly type_id: UUID;
}

export function TypeId<Base extends object>(base: Base & Partial<{ type_id: UUID }>): TypeId {
    Object.defineProperty(base, 'type_id', { enumerable: true, value: v4() });
    return base as TypeId;
}

TypeId.of = function (type: unknown): UUID | undefined {
    if (isObject(type) && 'type_id' in type && typeof type.type_id === 'string') {
        return type.type_id as UUID;
    }
}