/**
 * Contrato comum de todo wrapper de payload. O tipo `T` é o formato esperado
 * dos dados daquele comando - cada wrapper preenche com o seu, então dentro
 * do encodePayload os campos ficam tipados (autocomplete + checagem do TS).
 */
export interface PayloadProtocol<T> {
    encodePayload(payload: T): Buffer;
}
