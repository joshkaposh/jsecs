if (import.meta.hot) {
    import.meta.hot.accept();
}
import html from 'solid-js/html';
import { mergeProps, onMount, Suspense } from 'solid-js';
import { type ClassRequest } from '../api';
import type { JSXElement } from '../primitives';
import { post, postStream } from '../api/post';

const fileHandle = async (props: { type?: "file" | 'directory' }): Promise<Blob & { kind: 'file' | 'directory' }> => {
    if (props.type === 'file') {
        if ('showOpenFilePicker' in window && typeof window.showOpenFilePicker === 'function') {
            const [fileHandle] = await window.showOpenFilePicker();
            console.log('FileHandle [file]: ', fileHandle);
            return fileHandle;
        } else {
            throw new Error('`window.showOpenFilePicker` is unsupported in this environment');
        }
    } else {
        if ('showDirectoryPicker' in window && typeof window.showDirectoryPicker === 'function') {
            const fileHandle = await window.showDirectoryPicker();
            console.log('FileHandle [directory]: ', fileHandle);

            return fileHandle;
        } else {
            throw new Error('`window.showDirectoryPicker` is unsupported in this environment');
        }
    }
}

function PickFilesButton(props: {
    type?: 'file' | 'directory'
}) {
    props = mergeProps({ type: 'file' } as const, props)


    return html`<button type="button" onclick=${async (e: Event) => {
        e.preventDefault();
        const handle = await fileHandle(props);
        console.log(handle.kind);

    }}>Pick Files<//>`
}

export function Editor(props: {
    root?: string | URL;
    implementations?: ClassRequest;
    children?: JSXElement;
}) {

    console.log('Editor mounted!');

    // console.log('Editor Root: ', props.root.toString());

    // const structs = createAsyncStore(GET_FILTERED_CLASSES(props.implementations));

    // createEffect(() => {
    //     console.log('STRUCTS', structs.latest)
    // })

    /*
        <${Suspense} fallback=${() => html`<p>Loading...</p>`}>
        <${For} each=${() => structs.latest}
        >
        ${(_struct: Struct) => {
            const refetch = () => { };
            const struct = () => _struct;
            return html`<${Struct} struct=${struct} refetch=${refetch} />`
        }}
        <//>
    <//>
    
        <${For} each=${() => structs.latest}
        >
        ${(_struct: Struct) => {
            const refetch = () => { };
            const struct = () => _struct;
            return html`<${Struct} struct=${struct} refetch=${refetch} />`
        }}
        <//>

    */

    return html`
        <${Suspense} fallback=${() => html`<p>Loading...</p>`}>
        <div>
            <${PickFilesButton} type='directory' />
            ${() => props.children}
        </div>
        <//>
    `;
}