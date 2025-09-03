function normalize_str(str: null | undefined | string) {
    return str == null ? '' : str.trim();
}

export const named_fn = <N extends string, A extends string = '', B extends string = ''>(descriptor: {
    name: N;
    args?: A;
    body?: B;
}) => `function ${normalize_str(descriptor.name)}(${normalize_str(descriptor.args) ?? ''}) { \n${normalize_str(descriptor.body) ?? ''}\n }` as const;

export const method_fn = <N extends string, A extends string = '', B extends string = ''>(descriptor: {
    name: N;
    args?: A;
    body?: B;
}) => `${normalize_str(descriptor.name)}(${normalize_str(descriptor.args)}) { \n${normalize_str(descriptor.body)}\n }` as const;

export const anon_fn = <A extends string = '', B extends string = ''>(
    descriptor: {
        args?: A;
        body?: B;
    }
) => `function (${normalize_str(descriptor.args) ?? ''}) { \n${normalize_str(descriptor.body) ?? ''}\n }` as const;

export const arrow_fn = <A extends string = '', B extends string = ''>(
    descriptor: {
        args?: A;
        body?: B;
    }
) => `(${normalize_str(descriptor.args) ?? ''}) => { \n${normalize_str(descriptor.body) ?? ''}\n }` as const;

export const inlined_arrow_fn = <A extends string = '', B extends string = '{ }'>(
    descriptor: {
        args?: A;
        body: B;
    }
) => `(${normalize_str(descriptor.args) ?? ''}) => ${normalize_str(descriptor.body)}` as const;

export const iffe_fn = <B extends string = ''>(body?: B) => `(function(){ ${body ?? ''} })()` as const;

type FnDict = {
    'named': typeof named_fn;
    'method': typeof method_fn;
    'anon': typeof anon_fn;
    'arrow': typeof arrow_fn;
    'inlined_arrow': typeof inlined_arrow_fn;
    'iffe': typeof iffe_fn;
}

export function fn_str<T extends keyof FnDict, const Descriptor extends Parameters<FnDict[T]>[0]>(type: T, descriptor: Descriptor) {
    switch (type) {
        case 'named':
            return named_fn(descriptor as any);
        case 'method':
            return method_fn(descriptor as any);
        case 'anon':
            return anon_fn(descriptor as any);
        case 'arrow':
            return arrow_fn(descriptor as any);
        case 'inlined_arrow':
            return inlined_arrow_fn(descriptor as any);
        case 'iffe':
            return iffe_fn(descriptor as any);
        default:
            throw new Error(`Unsupported function type: ${type}`)
    }
}

export type NamedFn<N extends string = string, A extends string = string, B extends string = string> = ReturnType<typeof named_fn<N, A, B>>;
export type MethodFn<N extends string = string, A extends string = string, B extends string = string> = ReturnType<typeof method_fn<N, A, B>>;
export type AnonFn<A extends string = string, B extends string = string> = ReturnType<typeof anon_fn<A, B>>;
export type ArrowFn<A extends string = string, B extends string = string> = ReturnType<typeof arrow_fn<A, B>>;
export type InlinedArrowFn<A extends string = string, B extends string = string> = ReturnType<typeof inlined_arrow_fn<A, B>>;
export type IffeFn<B extends string = string> = ReturnType<typeof iffe_fn<B>>;

export type FnString<N extends string = string, A extends string = string, B extends string = string> = NamedFn<N, A, B> | AnonFn<A, B> | ArrowFn<A, B> | InlinedArrowFn<A, B> | IffeFn<B>;