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
