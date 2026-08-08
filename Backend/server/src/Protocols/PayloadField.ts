/** Descrição de um campo: nome + quantos bytes ocupa + se é com sinal. */
export interface PayloadField {
    field: string;
    length?: number;
    signed?: boolean;
}

/** Um campo com valor (usado no encode). Reaproveita a descrição do PayloadField. */
export interface PayloadItem extends PayloadField {
    value: number;
}
