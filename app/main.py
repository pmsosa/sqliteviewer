from fastapi import FastAPI, Request, File, UploadFile, HTTPException, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import sqlite3
import os
import uuid
import shutil

app = FastAPI(title="SQLite Viewer")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Store local paths if necessary
db_paths = {}

def get_db_connection(db_id: str):
    if db_id in db_paths:
        db_path = db_paths[db_id]
    else:
        db_path = os.path.join(UPLOAD_DIR, f"{db_id}.db")
        
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database not found")
        
    try:
        # Open in read-only mode to prevent accidental modifications
        # file:... ?mode=ro requires uri=True
        db_uri = f"file:{os.path.abspath(db_path)}?mode=ro"
        conn = sqlite3.connect(db_uri, uri=True)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/upload")
async def upload_db(file: UploadFile = File(...)):
    if not file.filename.endswith(('.db', '.sqlite', '.sqlite3')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a SQLite database.")
        
    db_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{db_id}.db")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"db_id": db_id, "filename": file.filename}

@app.post("/api/connect_local")
async def connect_local(path: str = Form(...)):
    if not os.path.exists(path):
        raise HTTPException(status_code=400, detail="File path does not exist on the server.")
    if not os.path.isfile(path):
        raise HTTPException(status_code=400, detail="Path is not a file.")
        
    db_id = str(uuid.uuid4())
    db_paths[db_id] = path
    return {"db_id": db_id, "filename": os.path.basename(path)}

@app.get("/api/{db_id}/tables")
async def list_tables(db_id: str):
    conn = get_db_connection(db_id)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [row["name"] for row in cursor.fetchall()]
        return {"tables": tables}
    finally:
        conn.close()

@app.get("/api/{db_id}/table/{table_name}")
async def get_table_data(db_id: str, table_name: str, limit: int = 100, offset: int = 0):
    conn = get_db_connection(db_id)
    try:
        cursor = conn.cursor()
        
        # Safe table name checking to prevent injection (sqlite_master)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Table not found")
        
        # Get schema
        cursor.execute(f"PRAGMA table_info({table_name})")
        schema = [{"cid": row["cid"], "name": row["name"], "type": row["type"]} for row in cursor.fetchall()]
        
        # Get total count
        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        total_rows = cursor.fetchone()["count"]
        
        # Get rows
        cursor.execute(f"SELECT * FROM {table_name} LIMIT ? OFFSET ?", (limit, offset))
        rows = [dict(row) for row in cursor.fetchall()]
        
        return {
            "schema": schema,
            "rows": rows,
            "total_rows": total_rows,
            "limit": limit,
            "offset": offset
        }
    finally:
        conn.close()

@app.post("/api/{db_id}/query")
async def execute_query(db_id: str, query: str = Form(...)):
    # Very basic query endpoint - read only
    conn = get_db_connection(db_id)
    try:
        cursor = conn.cursor()
        # Make sure it's a SELECT query for safety
        if not query.strip().upper().startswith("SELECT") and not query.strip().upper().startswith("PRAGMA"):
            raise HTTPException(status_code=400, detail="Only SELECT or PRAGMA queries are allowed for safety.")
            
        cursor.execute(query)
        rows = [dict(row) for row in cursor.fetchall()]
        
        # Infer schema from description
        columns = [description[0] for description in cursor.description] if cursor.description else []
        schema = [{"name": col} for col in columns]
        
        return {
            "schema": schema,
            "rows": rows
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
