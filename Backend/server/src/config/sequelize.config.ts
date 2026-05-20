import 'dotenv/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import 'dotenv/config';

export const sequelizeConfig: SequelizeModuleOptions = {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    autoLoadModels: true,
    synchronize: true,
    timezone: "-03:00",
    dialectOptions: {
        encrypt: false,
        trustServerCertificate: true,
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    useUTC: false,

    logging: false,
    
    define: {
        timestamps: true,
    },

    pool:{
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    }
} as SequelizeModuleOptions & { 
    hooks?: any 
};

