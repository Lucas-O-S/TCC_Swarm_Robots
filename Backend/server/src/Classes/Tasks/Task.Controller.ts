import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { BaseController } from 'src/Classes/Base/Base.Controller';
import { TaskModel } from 'src/Model/Task.Model';
import { JwtAuthGuard } from 'src/Auth/Guards/JwtAuth.Guard';
import { TaskService } from './Task.Service';
import { TaskCreateDto } from './DTO/task.create.dto';
import { TaskUpdateDto } from './DTO/task.update.dto';
import { TaskSchema } from './Schema/Task.Schema';

/**
 * GET /, GET /:uuid, DELETE /:uuid vêm do BaseController como estão.
 * create/update são sobrescritos só pra trocar `Partial<T>` pelo DTO
 * concreto - ver comentário no BaseController.
 */
@Controller('tasks')
@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TaskController extends BaseController<TaskModel> {

    constructor(taskService: TaskService) {
        super(taskService);
    }

    @Post()
    @ApiBody(TaskSchema)
    async create(@Body() dto: TaskCreateDto): Promise<TaskModel> {
        return super.create(dto);
    }

    @Put(':uuid')
    @ApiBody(TaskSchema)
    async update(@Param('uuid') uuid: string, @Body() dto: TaskUpdateDto): Promise<TaskModel> {
        return super.update(uuid, dto);
    }
}
