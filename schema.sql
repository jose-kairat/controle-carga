-- Controle de Carga — D1 schema
-- roster holds both athletes and staff, distinguished by role.
CREATE TABLE IF NOT EXISTS roster (
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('athlete','staff')),
  hash TEXT NOT NULL,
  PRIMARY KEY (name, role)
);

-- One row per athlete per day. dor_regiao stores the {label:"..."} object as JSON text, or NULL.
CREATE TABLE IF NOT EXISTS entries (
  athlete TEXT NOT NULL,
  date TEXT NOT NULL,
  sleep INTEGER,
  fatigue INTEGER,
  dor INTEGER,
  dor_regiao TEXT,
  stress INTEGER,
  pse INTEGER,
  duration REAL,
  load REAL,
  PRIMARY KEY (athlete, date)
);
