from __future__ import annotations

CLEAN_EXPORT_MSG_TYPES: frozenset[str] = frozenset(
    {
        "GPS",
        "IMU",
        "ATT",
        "FMT",
        "FMTU",
        "UNIT",
        "MULT",
        "SIM",
        "SIM2",
        "VER",
        "MODE",
        "STAT",
        "MSG",
    }
)
