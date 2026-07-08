CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks: conceito da sua aplicação (não faz parte do protocolo DotBot).
CREATE TABLE tasks (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    priority INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);


CREATE TABLE robots (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    address VARCHAR(16) NOT NULL UNIQUE,

    name VARCHAR(255) NOT NULL,

    application SMALLINT NOT NULL DEFAULT 0 CHECK (application BETWEEN 0 AND 4),

    swarm_id VARCHAR(8) NOT NULL DEFAULT '0000',

    status SMALLINT NOT NULL DEFAULT 1 CHECK (status BETWEEN 0 AND 2),

    mode SMALLINT NOT NULL DEFAULT 0 CHECK (mode BETWEEN 0 AND 1),

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
