import { CommandService } from "../Classes/Commands/Command.Service";
import { GatewayAdapter } from "../adapter/GatewayAdapter.interface";
import { Command } from "../Enums/Command.enum";
import { PayloadType } from "../Enums/PayloadType.enum";

const A = "BDF2B04BC00D2725";

// Gateway que só anota o que sairia pelo rádio.
const recorder = () => {
    const sent: { destination: string; payloadType: PayloadType; body: string }[] = [];
    const gateway: GatewayAdapter = {
        send: (destination, payloadType, body) => sent.push({ destination, payloadType, body: body.toString("hex") }),
        onFrameReceived: () => {},
    };
    return { sent, service: new CommandService(gateway) };
};

describe("CommandService - control-mode para o robô de verdade", () => {

    // Firmware 1.23.0: o CONTROL_MODE só zera os motores uma vez; em Auto o
    // laço religa no próximo fix. Quem tira do Auto é o LH2_WAYPOINTS vazio.
    it("manda LH2_WAYPOINTS vazio antes do CONTROL_MODE", () => {
        const { sent, service } = recorder();

        service.send(A, Command.ControlMode, { mode: 1 });

        expect(sent).toEqual([
            { destination: A, payloadType: PayloadType.LH2_WAYPOINTS, body: "000000" }, // threshold u16 0 + count 0
            { destination: A, payloadType: PayloadType.CONTROL_MODE, body: "01" },
        ]);
    });

    it("os outros comandos continuam saindo num pacote só", () => {
        const { sent, service } = recorder();

        service.send(A, Command.Waypoints, { threshold: 50, waypoints: [{ x: 1000, y: 1200 }] });
        service.send(A, Command.MoveRaw, { left_x: 0, left_y: 60, right_x: 0, right_y: 60 });

        expect(sent.map((s) => s.payloadType)).toEqual([PayloadType.LH2_WAYPOINTS, PayloadType.CMD_MOVE_RAW]);
    });

    it("endereço inválido não manda nada", () => {
        const { sent, service } = recorder();

        expect(() => service.send("xyz", Command.ControlMode, { mode: 0 })).toThrow();
        expect(sent).toEqual([]);
    });
});
