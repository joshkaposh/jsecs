import type { JSX } from "solid-js";
import html from "solid-js/html";

export type ComponentReturnType = undefined | null | Node | Node[];

export type Component<Props extends Record<string, any> = {}> = (props: Props) => ComponentReturnType;
export type ComponentProps<T> = T extends Component<infer Props> ? Props : never;

export type JSXElement = ComponentReturnType | Component;

export type ElementTag = keyof HTMLElementTagNameMap;
export type ElementAttributes<Tag extends ElementTag> = JSX.HTMLAttributes<HTMLElementTagNameMap[Tag]>

export type IntoTemplateLiteral = string | number | bigint | boolean | null | undefined;
export type StringProps<T extends IntoTemplateLiteral | StringProps = string> =
    `${string}=${`"${T}"`
    | `'${T}'`}`
    | `${string} = ${`"${T}"`
    | `'${T}'`}`
    | T;
// | `$\{${T}}`;


export function el<
    Tag extends ElementTag,
    Props extends StringProps | ElementAttributes<Tag>,
    Children
>(tag: Tag, props?: Props | null, children?: Children) {
    let args = '';
    const listeners: Record<string, any> = {};

    if (!props || typeof props === 'string') {
        args = props ?? '';
    } else {
        const entries = Object.entries(props);
        console.log('---Element Props---');

        console.table(entries);
        for (const [k, v] of entries) {

            if (k.startsWith('on') || typeof v === 'function') {
                listeners[k] = v;
                //  onClick=${increment}
            } else {
                const str = `${k}=${typeof v === 'string' ? `"${v}"` : `$\{${v}}`}`;
                args += str;
            }

        }
    }
    const h = `<${tag} ${args}>${children}<//>`;
    return html(
        [h] as unknown as TemplateStringsArray,
        null, listeners
    );
}

export function comp<
    T extends Component,
    Children
>(type: T, props?: ComponentProps<T>, children?: Children) {
    const ty = typeof type;
    if (ty === 'string') {
        const str = `<${type}>${children}</${type}>`;
        return html([str] as any, props);
        // return el(type as any, props as any, children);
    }
    // else if (ty === 'function') {
    //     return html`<${type} ...${props}>${children}<//>`;
    // }

}
