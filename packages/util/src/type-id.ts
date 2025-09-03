import { isObject } from './predicate';

export type UUID = `${string}-${string}-${string}-${string}`;

export type TypeId = {
    readonly type_id: UUID;
}

export function TypeId(): UUID;
export function TypeId<Base extends object>(base: Base): Base & TypeId;
export function TypeId<Base extends object>(base?: Base & Partial<{ type_id: UUID }>): UUID | (Base & TypeId) {
    if (base) {
        if (base.type_id == null) {
            Object.defineProperty(base, 'type_id', { enumerable: true, value: crypto.randomUUID(), writable: false, configurable: false });
        }
    } else {
        return crypto.randomUUID();
    }

    return base as Base & TypeId;
}

TypeId.of = function (type: unknown): UUID | undefined {
    if (isObject(type) && 'type_id' in type && typeof type.type_id === 'string') {
        return type.type_id as UUID;
    }
}
