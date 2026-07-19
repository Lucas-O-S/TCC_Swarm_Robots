/**
 * Contrato de quem SAI (comando que você manda pro robô): recebe os dados e
 * devolve os bytes. O tipo `T` é o formato daquele comando.
 */
export interface PayloadProtocol<T> {
    encodePayload(payload: T): Buffer;
}

/**
 * Contrato de quem ENTRA (dado que o robô manda de volta): recebe os bytes e
 * devolve o objeto tipado. O tipo `T` é o formato daquele dado.
 */
export interface PayloadDecoder<T> {
    decodePayload(body: Buffer): T;
}

export interface genericPayload {
}
