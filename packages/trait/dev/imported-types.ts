export const boolean = false;

export const anon_fn_assign = function () { }

export function normal_function() {
    const inner_bool = boolean;
    const inner_fn = anon_fn_assign;

    const result = anon_fn_assign();

    const result2 = anon_fn_assign();

    return {
        result, result2
    }
}

export const object_literal = {
    deeply: {
        nested: {
            function() {
                const { result2, result } = normal_function();
                return [result, result2];
            }
        }
    }
};