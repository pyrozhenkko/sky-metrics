from __future__ import annotations

from collections.abc import Set
from math import isnan
from pathlib import Path
from typing import Any

import pandas as pd
from pymavlink.DFReader import DFReader_binary


def iter_dataflash_messages(bin_path: Path):
    reader = DFReader_binary(str(bin_path))
    try:
        while True:
            msg = reader.recv_match(blocking=False)
            if msg is None:
                break
            if getattr(msg, "fmt", None) is None:
                continue
            name = msg.get_type()
            row = msg.to_dict()
            fields = {
                k: v for k, v in row.items() if k != "mavpackettype" and k != name
            }
            yield name, fields
    finally:
        try:
            reader.close()
        except OSError:
            pass


def _time_us_to_timestamp_s(time_us: Any) -> float | None:
    if time_us is None:
        return None
    if isinstance(time_us, float) and isnan(time_us):
        return None
    try:
        return float(time_us) * 1e-6
    except (TypeError, ValueError):
        return None


def message_to_long_rows(msg_type: str, fields: dict[str, Any]) -> list[dict[str, Any]]:
    ts = _time_us_to_timestamp_s(fields.get("TimeUS"))
    rows: list[dict[str, Any]] = []
    for field_name, value in fields.items():
        if field_name == "TimeUS":
            continue
        rows.append(
            {
                "timestamp": ts,
                "msg_type": msg_type,
                "field": field_name,
                "value": value,
            }
        )
    return rows


def messages_to_long_dataframe(
    bin_path: Path,
    *,
    separator_rows: bool = False,
    msg_types: Set[str] | None = None,
) -> pd.DataFrame:
    records: list[dict[str, Any]] = []
    gen = iter_dataflash_messages(bin_path)
    try:
        for msg_type, fields in gen:
            if msg_types is not None and msg_type not in msg_types:
                continue
            records.extend(message_to_long_rows(msg_type, fields))
            if separator_rows:
                records.append(
                    {
                        "timestamp": None,
                        "msg_type": "",
                        "field": "",
                        "value": "",
                    }
                )
    finally:
        gen.close()
    if separator_rows and records and records[-1]["msg_type"] == "":
        records.pop()
    return pd.DataFrame.from_records(records)


def collect_export_sources(
    bin_path: Path,
    msg_types: Set[str] | None = None,
) -> tuple[dict[str, pd.DataFrame], pd.DataFrame]:
    buckets: dict[str, list[dict[str, Any]]] = {}
    fmt_raw: list[dict[str, Any]] = []
    gen = iter_dataflash_messages(bin_path)
    try:
        for msg_type, fields in gen:
            if msg_types is not None and msg_type not in msg_types:
                continue
            fd = dict(fields)
            if msg_type == "FMT":
                fmt_raw.append(fd)
            buckets.setdefault(msg_type, []).append(fd)
    finally:
        gen.close()
    used = frozenset(buckets.keys())
    seen: set[str] = set()
    fmt_rows: list[dict[str, Any]] = []
    for f in fmt_raw:
        raw_name = f.get("Name")
        name = raw_name if isinstance(raw_name, str) else None
        if name is None or name not in used:
            continue
        if name in seen:
            continue
        seen.add(name)
        fmt_rows.append(
            {
                "Type": f.get("Type"),
                "Length": f.get("Length"),
                "Name": name,
                "Count": len(buckets[name]),
                "Format": f.get("Format"),
                "Columns": f.get("Columns"),
            }
        )
    by_type = {k: pd.DataFrame(v) for k, v in buckets.items()}
    cols = ["Type", "Length", "Name", "Count", "Format", "Columns"]
    df_fmt = pd.DataFrame(fmt_rows, columns=cols)
    return by_type, df_fmt


def messages_wide_by_type(bin_path: Path) -> dict[str, pd.DataFrame]:
    by_type, _ = collect_export_sources(bin_path)
    return by_type
