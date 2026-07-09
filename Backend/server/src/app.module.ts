import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { sequelizeConfig } from './config/sequelize.config';
import { SequelizeModule } from '@nestjs/sequelize';
import { RobotModule } from './Classes/Robots/Robot.module';

@Module({
  imports: [
    SequelizeModule.forRoot(sequelizeConfig),
    RobotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
