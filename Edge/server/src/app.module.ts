import { Module } from '@nestjs/common';
import { AllModules } from './index/IndexModule';

@Module({
    imports: [...AllModules],
})
export class AppModule {}
