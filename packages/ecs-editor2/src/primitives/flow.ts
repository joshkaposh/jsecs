import type { JSXElement } from './create';

export function Show<T extends JSXElement>(when: () => boolean | null | undefined | void, children: () => T) {
    return () => when() ? children() : undefined;
}

/**
 * This module is similar to solid-js's Control Flow components,
 * except there is not JSX involved.
 */