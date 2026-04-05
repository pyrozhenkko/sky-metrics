from __future__ import annotations

from pathlib import Path

import tempfile
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from flightlog.analysis import build_mission_json

MAX_BIN_BYTES = 256 * 1024 * 1024

_PROGRAM_ROOT = Path(__file__).resolve().parent.parent
_INPUT_ROOT = (_PROGRAM_ROOT / "input").resolve()

app = FastAPI(title="Flight log analyzer")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> JSONResponse:
    if file.size and file.size > MAX_BIN_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds size limit")
        
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
        
    try:
        payload = build_mission_json(tmp_path)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse Dataflash: {exc!s}",
        ) from exc
    finally:
        tmp_path.unlink()
        
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
