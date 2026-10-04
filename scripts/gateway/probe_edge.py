#!/usr/bin/env python3
"""Mostra EXATAMENTE o que o marilib enxerga na serial do gateway.

Usa o SerialAdapter/HDLC do proprio marilib, entao o que sair daqui e o que
o swarmit ve. Nao depende do sniff.mjs.

Uso:  <python do venv do swarmit> probe_edge.py /dev/tty.usbmodem... [baud] [segundos]
"""
import sys
import time
from collections import Counter

from marilib.communication_adapter import SerialAdapter
from marilib.model import EdgeEvent, GatewayInfo
from marilib.mari_protocol import MARI_GATEWAY_INFO_VERSION, Frame

port = sys.argv[1]
baud = int(sys.argv[2]) if len(sys.argv) > 2 else 1000000
secs = float(sys.argv[3]) if len(sys.argv) > 3 else 8.0

kinds = Counter()
samples = {}


def on_data(data, rx_ts_us=None):
    key = (data[0], len(data))
    kinds[key] += 1
    samples.setdefault(key, bytes(data))


adapter = SerialAdapter(port, baud)
adapter.init(on_data)
print(f"escutando {secs:.0f}s...")
time.sleep(secs)

print(f"\nframes HDLC ok: {adapter.stats.rx_frames_ok}   hdlc err: {adapter.stats.rx_hdlc_err}")
print(f"marilib espera gateway_info v{MARI_GATEWAY_INFO_VERSION} e corpo de "
      f"{sum(m.length for m in GatewayInfo().metadata)} bytes\n")

if not kinds:
    print("NENHUM frame chegou. O gateway nao esta emitindo nesta porta.")
    sys.exit(0)

for (ev, ln), n in sorted(kinds.items(), key=lambda kv: -kv[1]):
    try:
        name = EdgeEvent(ev).name
    except ValueError:
        name = f"!! FORA DO ENUM (marilib so conhece 1..5)"
    body = samples[(ev, ln)][1:]
    print(f"byte0=0x{ev:02x} {name:<22} corpo={len(body):>4}B  x{n}")
    print(f"   {body[:40].hex(' ')}{' ...' if len(body) > 40 else ''}")
    if ev == EdgeEvent.GATEWAY_INFO:
        try:
            info = GatewayInfo().from_bytes(body)
            print(f"   -> parse OK, version={info.version} "
                  f"net=0x{info.network_id:04x} schedule={info.schedule_id}")
        except Exception as exc:
            print(f"   -> PARSE FALHOU: {exc}")
    if ev == EdgeEvent.NODE_DATA:
        try:
            frame = Frame().from_bytes(body)
            h = frame.header
            print(f"   -> parse OK, src=0x{h.source:016x} net=0x{h.network_id:04x} "
                  f"proto=0x{h.next_proto:02x}")
        except Exception as exc:
            print(f"   -> PARSE FALHOU: {exc}")
    print()
