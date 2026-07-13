

export interface PayloadCodec<T> {
    encodePayload(payload: T): Buffer;
}

