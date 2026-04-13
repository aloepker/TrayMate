package com.traymate.backend.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MeResponse {
    
    private Long id;
    private String fullName;
    private String role;
}
