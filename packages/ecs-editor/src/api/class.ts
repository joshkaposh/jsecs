import { post } from "./post";

export type DecoratorMap = Record<string, <T extends abstract new (...args: any[]) => any>(target: T) => T | void>;


export type ClassRequestType = {
    array: string[]
    path: string | URL;
}

export type ClassRequest<T extends keyof ClassRequestType = keyof ClassRequestType> = ClassRequestType[T];

function ClassRequest<T extends keyof ClassRequestType>(type: ClassRequest<T>) {
    if (Array.isArray(type)) {
        return { type: 'array', data: type };
    } else if (typeof type === 'string' || type instanceof URL) {
        return { type: 'path', data: type };
    } else if (type && typeof type === 'object') {
        return { type: 'array', data: Object.keys(type) }
    }
}

export const GET_FILTERED_CLASSES = (data: ClassRequest) => {
    return async () => {
        const res = await post('http://localhost:3000/structs', ClassRequest(data))
        try {
            return await res.json();
        } catch (error) {
            console.error(error)
        }
    }
}

export const GET_FILTERED_CLASS = async (decorators: DecoratorMap, class_name: string) => {
    const res = await post('http://localhost:3000/structs', {
        decorator_filter: Object.keys(decorators),
        class: class_name
    });

    return await res.json();
}
