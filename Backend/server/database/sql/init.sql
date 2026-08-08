CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuários (operadores) do sistema - auth básica usuário/senha.
CREATE TABLE users (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Tasks: conceito da sua aplicação (não faz parte do protocolo DotBot).
CREATE TABLE tasks (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    -- 0=Pending, 1=InProgress, 2=Completed, 3=Cancelled
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 3),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Task padrão/genérica: uuid fixo pra poder ser referenciada (ex.: robô que
-- ainda não tem uma tarefa "de verdade" atribuída, mas você quer um valor
-- não-nulo pra testar). Não é atribuída a `robots.task_id` automaticamente -
-- isso continua nullable, cada robô só ganha essa task se alguém atribuir.
INSERT INTO tasks (uuid, name, priority)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tarefa padrão', 0);

-- Pontos do trajeto de uma task (conteúdo de missão). Uma task tem vários,
-- na ordem de `order_index`. É o que o Orchestrator manda pro robô como waypoints.
CREATE TABLE task_waypoints (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    order_index INT NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(uuid)
);

-- Task de teste (pendente) com 3 waypoints, pra servir de cobaia pro
-- Orchestrator: assim que houver um robô livre em modo Auto, ela deve ser
-- atribuída e os pontos mandados pro robô.
INSERT INTO tasks (uuid, name, priority, status)
VALUES ('00000000-0000-0000-0000-000000000002', 'Patrulha de teste', 0, 0);

INSERT INTO task_waypoints (task_id, order_index, x, y) VALUES
    ('00000000-0000-0000-0000-000000000002', 0, 1000, 2000),
    ('00000000-0000-0000-0000-000000000002', 1, 1500, 800),
    ('00000000-0000-0000-0000-000000000002', 2, 300,  300);


CREATE TABLE robots (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    address VARCHAR(16) NOT NULL UNIQUE,

    name VARCHAR(255) NOT NULL,

    application SMALLINT NOT NULL DEFAULT 0 CHECK (application BETWEEN 0 AND 4),

    swarm_id VARCHAR(8) NOT NULL DEFAULT '0000',

    status SMALLINT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 2),

    mode SMALLINT NOT NULL DEFAULT 0 CHECK (mode BETWEEN 0 AND 2),

    calibrated SMALLINT NOT NULL DEFAULT 0,

    battery FLOAT NOT NULL DEFAULT 3.0,

    waypoints_threshold INT NOT NULL DEFAULT 100,

    last_sync TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    task_id UUID NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (task_id) REFERENCES tasks(uuid)
);

CREATE TABLE position (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    robot_id UUID NOT NULL,

    source SMALLINT NOT NULL DEFAULT 0 CHECK (source BETWEEN 0 AND 1),

    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    direction INT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (robot_id) REFERENCES robots(uuid)
);
