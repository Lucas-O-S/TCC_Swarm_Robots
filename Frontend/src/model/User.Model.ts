/**
 * Representação de usuário usada pela UI — datas já como `Date` (não string
 * ISO crua) e `isDeleted` derivado de `deletedAt`, poupando toda tela que
 * for usar isso de refazer essa checagem. Ver `User.Mapper.ts` pra
 * conversão a partir do DTO (o formato "de rede").
 */
export interface UserModel {
  uuid: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

/** Retorno de `POST /auth/register` — só o suficiente pra confirmar a criação. */
export interface UserSummaryModel {
  uuid: string;
  username: string;
}
