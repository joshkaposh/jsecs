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