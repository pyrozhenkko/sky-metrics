from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from flightlog.analysis import build_mission_json

MAX_BIN_BYTES = 256 * 1024 * 1024

_PROGRAM_ROOT = Path(__file__).resolve().parent.parent
_INPUT_ROOT = (_PROGRAM_ROOT / "input").resolve()

app = FastAPI(title="Flight log analyzer")


def _resolve_input_bin(path_param: str) -> Path:
    s = path_param.strip().replace("\\", "/")
    if not s or s.startswith("/") or ".." in Path(s).parts:
        raise HTTPException(
            status_code=400,
            detail="Invalid path",
        )
    if "/" not in s:
        resolved = (_INPUT_ROOT / s).resolve()
    else:
        resolved = (_PROGRAM_ROOT / s).resolve()
    try:
        resolved.relative_to(_INPUT_ROOT)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="File must be inside the input directory",
        ) from exc
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    size = resolved.stat().st_size
    if size == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if size > MAX_BIN_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File exceeds size limit",
        )
    return resolved


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


class AnalyzeRequest(BaseModel):
    path: str = Field(
        ...,
        min_length=1,
        examples=["input/00000001.BIN"],
    )


@app.post("/analyze")
async def analyze(body: AnalyzeRequest) -> JSONResponse:
    bin_path = _resolve_input_bin(body.path)
    try:
        payload = build_mission_json(bin_path)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse Dataflash: {exc!s}",
        ) from exc
    return JSONResponse(content=payload)


def run() -> None:
    import uvicorn

    uvicorn.run(
        "flightlog.server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )


if __name__ == "__main__":
    run()
