import html from 'solid-js/html';
import { createStore } from 'solid-js/store';
import { createContext, useContext } from 'solid-js';
import type { JSXElement } from '../primitives';

// type EditorContext = {
//     root: null | undefined | {
//         path: string;
//         filter: string[];
//     }
// };

const EditorContext = createContext();

export function useEditor() {
    const ctx = useContext(EditorContext);
    if (!ctx) {
        throw new Error('Cannot use `EditorContext` outside the bounds of a EditorProvider.')
    }
}

export function EditorProvider(props: {
    initialValue?: any;
    children?: JSXElement;
}) {
    const [store, setStore] = createStore<any>({
        root: null,
    });

    const read = {
        get root() {
            return store.root;
        }
    } as const;

    const api = {
        setRoot(root: string) {

        }
    } as const;

    return html`<${EditorContext.Provider} value=${[read, api]}>${() => props.children}<//>`
}
