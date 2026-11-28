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

    -- Sempre em MAIÚSCULAS (Protocol.normalizeAddress): o Postgres compara com
    -- caixa, então 'CCD2...' e 'ccd2...' seriam dois robôs diferentes.
    address VARCHAR(16) NOT NULL UNIQUE
        CONSTRAINT robots_address_upper CHECK (address = UPPER(address)),

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

-- Gateway = uma borda (EDGE_ID) + o transporte dela (GATEWAY_MODE) + a rede
-- Mari (MARI_NETWORK_ID). Criado sozinho quando a borda conecta no /edge com
-- essa identidade no handshake. O modo entra na chave porque a mesma borda em
-- mqtt (simulador) tem o mesmo EDGE_ID e a mesma rede.
CREATE TABLE IF NOT EXISTS gateways (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_id VARCHAR(255) NOT NULL,
    mode VARCHAR(16) NOT NULL CHECK (mode IN ('mari', 'mqtt', 'simulator')),
    -- 4 hex maiúsculos, ex.: '1200'.
    network_id VARCHAR(4) NOT NULL CHECK (network_id = UPPER(network_id)),
    name VARCHAR(255) NOT NULL,
    connected BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT gateways_identity UNIQUE (edge_id, mode, network_id)
);

CREATE TABLE scenario (
    
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    
    size_x INT NOT NULL,
    size_y INT NOT NULL,

    -- Mapa de um gateway: um cenário por gateway, criado e atualizado pela
    -- borda (arena:snapshot). O usuário edita nome, descrição e obstáculos.
    gateway_id UUID NULL,
    -- Área em mm no referencial em que os robôs reportam a posição (Y pra
    -- baixo, origem no canto superior-esquerdo); size_x/size_y = largura/altura.
    -- lh2 = calibração LH2 da borda; config = ARENA_* da borda (sem LH2).
    area_source VARCHAR(8) NULL CHECK (area_source IN ('lh2', 'config')),
    -- area = área real da calibração; pydotbot = 5 × o retângulo a partir de
    -- (0, 0); config = ARENA_* a partir de (0, 0).
    area_layout VARCHAR(10) NULL CHECK (area_layout IN ('area', 'pydotbot', 'config')),
    area_x INT NULL,
    area_y INT NULL,
    -- Retângulo das 4 marcas de calibração no chão, canais, created_at e TOML
    -- da calibração (só lh2).
    calibration_x INT NULL,
    calibration_y INT NULL,
    calibration_width INT NULL,
    calibration_height INT NULL,
    calibration_channels INT[] NULL,
    calibration_version VARCHAR(32) NULL,
    calibration_file VARCHAR(1024) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    CONSTRAINT scenario_gateway UNIQUE (gateway_id),
    FOREIGN KEY (gateway_id) REFERENCES gateways(uuid)
);

CREATE TABLE obstacle (
    
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    size_x INT NOT NULL,
    size_y INT NOT NULL,
    start_point_x INT NOT NULL,
    start_point_y INT NOT NULL, 
    
    scenario_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (scenario_id) REFERENCES scenario(uuid)
);
