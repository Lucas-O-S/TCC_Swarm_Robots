import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { sequelizeConfig } from './config/sequelize.config';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [
    SequelizeModule.forRoot(sequelizeConfig)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
