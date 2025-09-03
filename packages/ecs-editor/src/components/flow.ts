import type { JSX } from "solid-js";
import type { JSXElement } from "../../src/primitives/create";

export function Show(props: {
    when: (() => boolean | null | undefined) | boolean | null | undefined;
    children: () => JSXElement | JSX.Element;
}) {
    const when = typeof props.when === 'function' ? props.when : () => props.when;
    return when() ? props.children() : null;
}