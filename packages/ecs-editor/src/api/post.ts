
export function post<Body extends BodyInit = string>(url: string | URL, body: Body, headers?: Headers, duplex?: any) {
    return fetch(url, {
        method: 'POST',
        headers: {
            ...headers,
            // 'Content-Type': 'application/json'
        } as Headers,
        body: body,
        duplex: 'half'
    } as any);
}

export function toStream<const T extends any[]>(...args: T) {

}

export function postStream(url: string | URL, stream: ReadableStream) {
    return fetch(url, {
        "method": "POST",
        headers: { 'Content-Type': "text/plain" },
        body: stream,
        duplex: 'half'
    } as any);
}