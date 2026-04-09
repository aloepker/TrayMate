package com.traymate.backend.messaging.dto;

import lombok.Data;

@Data
public class SendMessageRequest {
    
    private Long receiverId;
    private String content;
}
