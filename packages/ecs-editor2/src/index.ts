import * as TYPES from '@ecs/core/macros';
import { onCleanup, createSignal, type JSX, splitProps, For, Suspense, createEffect } from "solid-js";
import { render } from "solid-js/web";
import html from "solid-js/html";
import { el, Show, type JSXElement } from './primitives';
import * as decorators from './my-custom-decorator';
import { createAsync, createAsyncStore } from '@solidjs/router';


// import { getClassStructuresStaticSync } from '@repo/macros';

// const structs = getClassStructuresStaticSync(process.cwd(), ['MyCustomDecorator'])

export const DropdownMenu = (props: {
    open?: boolean;
    submenu?: boolean;
    children?: JSXElement;
    id?: string;
    class?: string;
    style?: JSX.CSSProperties;
}) => {

    const [elementProps] = splitProps(props, ['class', 'id', 'style']);

    return html`<div ...${elementProps}>
        ${Show(() => props.open, () => props.children)}
    </div>`
};

function Button(props: any) {
    return html`<button ...${props} />`;
}

function App() {
    const [count, setCount] = createSignal(0);
    const increment = (e: any) => setCount((c) => c + 1);
    const getStructs = async () => {
        const res = await fetch('http://localhost:3000/structs', {
            'method': 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.keys(decorators))
        });

        return await res.json();
    }
    const structs = createAsyncStore(getStructs)
    // const [] = createA
    const types = Object.keys(TYPES);

    /**
    ${el('p', null, 'himom')}
    ${el('p', `id='himom' class='bread-and-butter'`, 'himom')}

     */

    return html`
    <${Button} type="button" onClick=${increment}>${count}<//>
    ${Show(() => count() >= 5, () => html`<h1 innerText=${'himom'} />`)}
    ${For({
        each: types,
        children: (type, index) => html`<p onclick=${(e: any) => {
            console.log(type);
        }}>${type}</p>`
    })}
    <${Button} type="button" onClick=${async (e: any) => {
            getStructs();
        }}>Fetch structs<//>
        
        ${Suspense({ fallback: 'Loading...', children: html`<p>structs: ${() => JSON.stringify(structs.latest)}</p>` })}

    `;
}


render(App, document.body);

// render(App, document.body);


// type EventListenerTagNameMap<T extends HTMLElement = HTMLElement> = {
//     [P in keyof T as (P extends `on${string}` ? P : never)]: T[P extends keyof T ? P : never];
// }

// type EventListener<Tag extends keyof HTMLElementTagNameMap> = EventListenerTagNameMap<HTMLElementTagNameMap[Tag]>;