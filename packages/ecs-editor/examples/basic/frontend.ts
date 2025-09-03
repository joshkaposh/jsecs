import { render } from 'solid-js/web';
import html from 'solid-js/html';
import { onMount, mergeProps } from 'solid-js';

type Entry = FileSystemDirectoryEntry
type Entry2 = FileSystemDirectoryHandle;
type P<T> = T extends Promise<infer Inner> ? Inner : never;
type E = P<ReturnType<Entry2['getDirectoryHandle']>>;
// type E2 = FileSystemHandle[''];
// type T = FileSystemDirectoryReader['']
const fileHandle = async (props: { type?: "file" | 'directory' }): Promise<FileSystemDirectoryHandle | FileSystemFileHandle | Error> => {
    if (props.type === 'file') {
        if ('showOpenFilePicker' in window && typeof window.showOpenFilePicker === 'function') {
            const [fileHandle] = await window.showOpenFilePicker() as FileSystemFileHandle[];
            return fileHandle;
        } else {
            return new Error('`window.showOpenFilePicker` is unsupported in this environment');
        }
    } else {
        if ('showDirectoryPicker' in window && typeof window.showDirectoryPicker === 'function') {
            const fileHandle = await window.showDirectoryPicker() as FileSystemDirectoryHandle;
            // console.log(fileHandle, fileHandle.resolve());

            // console.log(Object.keys(fileHandle), Object.keys(fileHandle.prototype));
            return fileHandle;
        } else {
            return new Error('`window.showDirectoryPicker` is unsupported in this environment');
        }
    }
}

function FileDropper(props: {
    id: string;
}) {

    // let ref: HTMLDivElement;

    // onMount(() => {
    //     ref = document.getElementById(props.id) as HTMLDivElement;
    //     console.log('ref', ref);

    //     ref.addEventListener('ondragenter', e => {
    //         e.preventDefault();
    //         e.stopImmediatePropagation();
    //         e.stopPropagation();
    //     });

    //     // ref.addEventListener('drop')
    //     ref.addEventListener('ondrop', e => {
    //         e.preventDefault();
    //         const items = e.dataTransfer!.items;
    //         for (let i = 0; i < items.length; i++) {
    //             const entry = items[i].webkitGetAsEntry();
    //             console.log(entry);

    //             // if (entry?.isDirectory) {

    //             // }
    //         }
    //     });

    //     console.log('ref', ref);

    // });

    return html`<div id=${props.id} style=${{ 'min-height': '100%', 'min-width': '100%' }}>
    </div>`;
}

function PickFiles(props: {
    type?: 'file' | 'directory'
}) {
    props = mergeProps({ type: 'directory' } as const, props)

    return html`<button type="button" onclick=${async (e: Event) => {
        const handle = await fileHandle(props).catch(console.error) as undefined | Blob & { kind: string };
        if (handle) {
            console.log(handle);
        }

    }}>Pick Files<//>`
}

function Editor() {
    return html`
        <${PickFiles} />
        <div style=${{ "min-height": '4rem', width: '25%', border: '1px solid black' }}>
        <${FileDropper} id='file-drop' />
        </div>
        `
}

function App() {
    return html`<${Editor} />`;
}

render(App, document.body);