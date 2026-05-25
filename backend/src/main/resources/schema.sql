CREATE TABLE IF NOT EXISTS meal_coverage_alert (
    id INT NOT NULL AUTO_INCREMENT,
    resident_id INT NOT NULL,
    meal_period VARCHAR(30) NOT NULL,
    total_meals_considered INT NOT NULL,
    detected_at DATETIME(6) NOT NULL,
    last_evaluated_at DATETIME(6) NOT NULL,
    status VARCHAR(20) NOT NULL,
    acknowledged_by_user_id BIGINT NULL,
    acknowledged_by_name VARCHAR(200) NULL,
    acknowledged_at DATETIME(6) NULL,
    resolved_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_meal_coverage_alert_status_detected (status, detected_at),
    INDEX idx_meal_coverage_alert_resident_period_status (resident_id, meal_period, status),
    INDEX idx_meal_coverage_alert_resident_detected (resident_id, detected_at)
);

CREATE TABLE IF NOT EXISTS dietary_audit_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    resident_id INT NOT NULL,
    field_name VARCHAR(64) NOT NULL,
    old_value VARCHAR(2000) NULL,
    new_value VARCHAR(2000) NULL,
    changed_by_user_id BIGINT NULL,
    changed_by_name VARCHAR(128) NULL,
    changed_by_role VARCHAR(64) NULL,
    changed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_dietary_audit_log_resident_changed (resident_id, changed_at)
);

CREATE TABLE IF NOT EXISTS medical_override_request (
    id INT NOT NULL AUTO_INCREMENT,
    resident_id INT NOT NULL,
    requested_by_user_id BIGINT NOT NULL,
    requested_by_name VARCHAR(200) NULL,
    requested_by_role VARCHAR(60) NULL,
    meal_ids VARCHAR(200) NOT NULL,
    meal_of_day VARCHAR(20) NULL,
    target_date DATE NULL,
    violations_json TEXT NULL,
    reason VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL,
    decided_by_user_id BIGINT NULL,
    decided_by_name VARCHAR(200) NULL,
    decision_reason VARCHAR(500) NULL,
    requested_at DATETIME(6) NOT NULL,
    decided_at DATETIME(6) NULL,
    expires_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_medical_override_request_status_requested (status, requested_at),
    INDEX idx_medical_override_request_resident_requested (resident_id, requested_at),
    INDEX idx_medical_override_request_resident_match (resident_id, meal_of_day, target_date, status)
);

ALTER TABLE residents
    ADD COLUMN IF NOT EXISTS dietary_restrictions VARCHAR(1000) NULL;

ALTER TABLE meals
    ADD COLUMN IF NOT EXISTS name_translations TEXT NULL;

ALTER TABLE meals
    ADD COLUMN IF NOT EXISTS description_translations TEXT NULL;

ALTER TABLE meals
    ADD COLUMN IF NOT EXISTS tag_translations TEXT NULL;

ALTER TABLE meal_orders
    ADD COLUMN IF NOT EXISTS note VARCHAR(1000) NULL;

ALTER TABLE meal_orders
    ADD COLUMN IF NOT EXISTS special_instructions VARCHAR(1000) NULL;

-- Tablet (kiosk) mode per resident. When true, the resident's tablet
-- hides logout and a staff PIN is required to leave the app.
ALTER TABLE residents
    ADD COLUMN IF NOT EXISTS tablet_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- Facility-wide key/value config (currently just the tablet PIN).
-- Kept as a single table so future settings don't need a new schema
-- change every time we add a knob.
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key   VARCHAR(64)  NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (setting_key)
);

-- Seed the default tablet PIN if no row exists yet.
INSERT INTO app_settings (setting_key, setting_value, updated_at)
SELECT 'tablet.pin', '1234', CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE setting_key = 'tablet.pin');

-- Real timestamp on each order row. The `date` column is LocalDate
-- (no time), which was being parsed as UTC midnight on the frontend
-- and rendering as 5/7/8pm depending on the device timezone. Backfill
-- existing rows to the start of the `date` so old orders still sort
-- correctly.
ALTER TABLE meal_orders
    ADD COLUMN IF NOT EXISTS created_at DATETIME(6) NULL;

UPDATE meal_orders
   SET created_at = TIMESTAMP(date, '00:00:00')
 WHERE created_at IS NULL AND date IS NOT NULL;

-- Original status column was VARCHAR(7) — silently truncated longer status
-- values like "preparing" (9), "completed" (9), and "cancelled" (9), which
-- is why kitchen-side status changes never made it back to the resident.
-- Widen to fit every valid status incl. "substitution_requested" (22).
ALTER TABLE meal_orders
    MODIFY COLUMN status VARCHAR(32) NULL;

-- Optional cook attribution for orders that went through the
-- "preparing" transition. Used by the kitchen single/bulk status PUT
-- endpoints so we know who started the tray.
ALTER TABLE meal_orders
    ADD COLUMN IF NOT EXISTS cook VARCHAR(200) NULL;

-- Per-resident UI language preference. Stored as the same display
-- string the frontend uses ("English", "Español", "Français", "中文")
-- so the app can hydrate SettingsContext directly. Default English so
-- existing residents are unaffected. Same column also feeds the
-- Gemini system prompt so GrannyBT replies in the resident's language.
ALTER TABLE residents
    ADD COLUMN IF NOT EXISTS language VARCHAR(20) NOT NULL DEFAULT 'English';
