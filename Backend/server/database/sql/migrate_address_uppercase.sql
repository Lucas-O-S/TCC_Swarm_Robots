-- Padroniza robots.address em MAIÚSCULAS (forma canônica do backend, ver
-- Protocol.normalizeAddress) e funde as duplicatas que surgiram quando o mesmo
-- robô existia nas duas caixas: cadastro manual em maiúsculas + auto-cadastro
-- do SwarmService em minúsculas.
--
-- Só para bancos criados antes desta mudança (o init.sql novo já nasce com o
-- CHECK). Roda numa transação; pode rodar de novo sem efeito.
--   psql -h localhost -U adm -d mari_database -f database/sql/migrate_address_uppercase.sql

BEGIN;

-- Em cada grupo do mesmo endereço (ignorando caixa) fica um sobrevivente:
-- não apagado > já em maiúsculas > mais antigo. O resto é duplicata.
CREATE TEMP TABLE address_merge ON COMMIT DROP AS
SELECT uuid, keep_uuid
FROM (
    SELECT uuid,
           FIRST_VALUE(uuid) OVER (
               PARTITION BY UPPER(address)
               ORDER BY (deleted_at IS NULL) DESC, (address = UPPER(address)) DESC, created_at
           ) AS keep_uuid
    FROM robots
) grupos
WHERE uuid <> keep_uuid;

-- Histórico de posição da duplicata passa para o sobrevivente.
UPDATE position p
SET robot_id = m.keep_uuid
FROM address_merge m
WHERE p.robot_id = m.uuid;

-- O SwarmService gravava status/bateria/last_sync na duplicata: se ela tem
-- dado mais recente, ele vai para o sobrevivente.
UPDATE robots k
SET status = d.status, battery = d.battery, last_sync = d.last_sync
FROM (
    SELECT DISTINCT ON (m.keep_uuid) m.keep_uuid, r.status, r.battery, r.last_sync
    FROM address_merge m
    JOIN robots r ON r.uuid = m.uuid
    ORDER BY m.keep_uuid, r.last_sync DESC
) d
WHERE k.uuid = d.keep_uuid
  AND d.last_sync > k.last_sync;

-- Task em andamento na duplicata não pode ficar órfã.
UPDATE robots k
SET task_id = d.task_id
FROM (
    SELECT DISTINCT ON (m.keep_uuid) m.keep_uuid, r.task_id
    FROM address_merge m
    JOIN robots r ON r.uuid = m.uuid
    WHERE r.task_id IS NOT NULL
    ORDER BY m.keep_uuid, r.last_sync DESC
) d
WHERE k.uuid = d.keep_uuid
  AND k.task_id IS NULL;

-- DELETE de verdade (não soft-delete): linha com deleted_at continua
-- ocupando o UNIQUE e travaria o UPPER abaixo.
DELETE FROM robots r
USING address_merge m
WHERE r.uuid = m.uuid;

UPDATE robots
SET address = UPPER(address)
WHERE address <> UPPER(address);

ALTER TABLE robots DROP CONSTRAINT IF EXISTS robots_address_upper;
ALTER TABLE robots ADD CONSTRAINT robots_address_upper CHECK (address = UPPER(address));

COMMIT;
