package com.traymate.backend.messaging;

import java.util.List;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import com.traymate.backend.auth.repository.UserRepository;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.messaging.dto.ChatResponse;
import com.traymate.backend.messaging.dto.MessageResponse;
import com.traymate.backend.messaging.dto.SendMessageRequest;

import lombok.RequiredArgsConstructor;

// @RestController
// @RequestMapping("/messages")
// @RequiredArgsConstructor
// public class MessageController {
    
//     private final MessageService service;

//     // SEND MESSAGE
//     @PostMapping("/send")
//     public MessageResponse sendMessage(
//             @RequestBody SendMessageRequest req,
//             Authentication authentication) {

//         Long senderId = Long.parseLong(authentication.getName());

//         return service.sendMessage(senderId, req);
//     }

//     // GET INBOX
//     @GetMapping("/inbox")
//     public List<Message> getInbox(Authentication authentication) {

//         Long userId = Long.parseLong(authentication.getName());

//         return service.getInbox(userId);
//     }

//     // GET CONVERSATION BETWEEN TWO USERS
//     @GetMapping("/conversation")
//     public List<Message> getConversation(
//             @RequestParam Long senderId,
//             @RequestParam Long receiverId) {

//         return service.getConversation(senderId, receiverId);
//     }
// }

@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService service;
    private final UserRepository userRepository;

    @PostMapping("/send")
    public MessageResponse sendMessage(
            @RequestBody SendMessageRequest req,
            Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        Long senderId = user.getId();

        return service.sendMessage(senderId, req);
    }

    @GetMapping("/inbox")
    public List<Message> getInbox(Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        return service.getInbox(user.getId());
    }

    @GetMapping("/conversation/{otherUserId}")
    public List<Message> getConversation(
            @PathVariable  Long otherUserId,
            Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email).orElseThrow();

        return service.getConversation(user.getId(), otherUserId);
    }

    // @GetMapping("/chats")
    // public List<Message> getchats(Authentication authentication){
    //     String email = authentication.getName();

    //     User user = userRepository.findByEmail(email).orElseThrow();

    //     return service.getChats(user.getId());
    // }
    @GetMapping("/chats")
    public List<ChatResponse> getChats(Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        return service.getChats(user.getId());
    }
}