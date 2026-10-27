import { robotCreateRequestSchema } from '../dto/robot.create.dto';
import { robotUpdateRequestSchema } from '../dto/robot.update.dto';
import {
  robotControlModeRequestSchema,
  robotMoveRawRequestSchema,
  robotRgbLedRequestSchema,
  robotWaypointsRequestSchema,
  robotXgoActionRequestSchema,
} from '../dto/robot.command.dto';
import type { RobotControlMode } from '../enums/RobotControlMode.enum';
import { RobotMapper } from '../mapper/Robot.Mapper';
import type {
  RobotCommandReceiptModel,
  RobotInput,
  RobotModel,
  RobotMoveInput,
  RobotRgbInput,
  RobotUpdateInput,
  RobotWaypointsInput,
} from '../model/Robot.Model';
import { RobotRepository } from '../repository/RobotRepository';
import { fromList, fromUnit, fromVoid, parseRequest } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/**
 * Robôs: CRUD por uuid + comandos por address (ver `RobotRepository`).
 *
 * Padrão de todo método de escrita: valida o que vai ser enviado
 * (`parseRequest`) -> chama o repository -> converte a resposta (`fromUnit`).
 * Se a validação falhar, NENHUMA chamada de rede é feita.
 */
export const RobotService = {
  async list(): Promise<ServiceResult<RobotModel[]>> {
    return fromList(await RobotRepository.findAll(), RobotMapper.fromDto);
  },

  async getByUuid(uuid: string): Promise<ServiceResult<RobotModel>> {
    return fromUnit(await RobotRepository.findByUuid(uuid), RobotMapper.fromDto);
  },

  async create(input: RobotInput): Promise<ServiceResult<RobotModel>> {
    const body = parseRequest(robotCreateRequestSchema, RobotMapper.toCreateDto(input));
    if (!body.ok) return body;
    return fromUnit(await RobotRepository.create(body.data), RobotMapper.fromDto);
  },

  async update(uuid: string, input: RobotUpdateInput): Promise<ServiceResult<RobotModel>> {
    const body = parseRequest(robotUpdateRequestSchema, RobotMapper.toUpdateDto(input));
    if (!body.ok) return body;
    return fromUnit(await RobotRepository.update(uuid, body.data), RobotMapper.fromDto);
  },

  async remove(uuid: string): Promise<ServiceResult<void>> {
    return fromVoid(await RobotRepository.remove(uuid));
  },

  // ------------------------------------------------------------- comandos (por address)
  async moveRaw(address: string, input: RobotMoveInput): Promise<ServiceResult<RobotCommandReceiptModel>> {
    const body = parseRequest(robotMoveRawRequestSchema, RobotMapper.toMoveRawDto(input));
    if (!body.ok) return body;
    const target = RobotMapper.normalizeAddress(address);
    return fromUnit(await RobotRepository.moveRaw(target, body.data), RobotMapper.commandReceiptFromDto);
  },

  async setRgbLed(address: string, input: RobotRgbInput): Promise<ServiceResult<RobotCommandReceiptModel>> {
    const body = parseRequest(robotRgbLedRequestSchema, RobotMapper.toRgbLedDto(input));
    if (!body.ok) return body;
    const target = RobotMapper.normalizeAddress(address);
    return fromUnit(await RobotRepository.setRgbLed(target, body.data), RobotMapper.commandReceiptFromDto);
  },

  /** Troca o modo (Manual/Auto/SemiAuto): o backend grava em `robots.mode` e para o robô. */
  async setControlMode(address: string, mode: RobotControlMode): Promise<ServiceResult<RobotCommandReceiptModel>> {
    const body = parseRequest(robotControlModeRequestSchema, RobotMapper.toControlModeDto(mode));
    if (!body.ok) return body;
    const target = RobotMapper.normalizeAddress(address);
    return fromUnit(await RobotRepository.setControlMode(target, body.data), RobotMapper.commandReceiptFromDto);
  },

  async sendWaypoints(address: string, input: RobotWaypointsInput): Promise<ServiceResult<RobotCommandReceiptModel>> {
    const body = parseRequest(robotWaypointsRequestSchema, RobotMapper.toWaypointsDto(input));
    if (!body.ok) return body;
    const target = RobotMapper.normalizeAddress(address);
    return fromUnit(await RobotRepository.sendWaypoints(target, body.data), RobotMapper.commandReceiptFromDto);
  },

  /** Só robôs XGO. */
  async sendXgoAction(address: string, action: number): Promise<ServiceResult<RobotCommandReceiptModel>> {
    const body = parseRequest(robotXgoActionRequestSchema, RobotMapper.toXgoActionDto(action));
    if (!body.ok) return body;
    const target = RobotMapper.normalizeAddress(address);
    return fromUnit(await RobotRepository.sendXgoAction(target, body.data), RobotMapper.commandReceiptFromDto);
  },
};