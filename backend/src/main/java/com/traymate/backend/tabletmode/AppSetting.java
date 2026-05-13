package com.traymate.backend.tabletmode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * Single-row-per-key facility settings store. Currently used only for
 * the Tablet Mode unlock PIN, but the key/value shape is general so we
 * can park future flags here without a new migration.
 */
@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppSetting {

    @Id
    @Column(name = "setting_key", length = 64, nullable = false)
    private String key;

    @Column(name = "setting_value", length = 255, nullable = false)
    private String value;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
