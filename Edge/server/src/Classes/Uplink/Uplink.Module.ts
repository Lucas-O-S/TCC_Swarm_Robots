import { Module } from "@nestjs/common";
import { UplinkService } from "./Uplink.Service";

@Module({
    providers: [UplinkService],
    exports: [UplinkService],
})
export class UplinkModule {}
