package com.traymate.backend.messaging;

import java.util.List;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.traymate.backend.auth.repository.UserRepository;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.messaging.dto.ChatResponse;
import com.traymate.backend.messaging.dto.MessageResponse;
import com.traymate.backend.messaging.dto.SendMessageRequest;
import com.traymate.backend.messaging.dto.UserList;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService service;
    private final UserRepository userRepository;
    private final UserMessagingService userMessagingService;

    private User currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User session is no longer valid"));
    }

    @PostMapping("/send")
    public MessageResponse sendMessage(
            @RequestBody SendMessageRequest req,
            Authentication authentication) {

        User user = currentUser(authentication);

        Long senderId = user.getId();

        return service.sendMessage(senderId, req);
    }

    @GetMapping("/inbox")
    public List<Message> getInbox(Authentication authentication) {

        User user = currentUser(authentication);

        return service.getInbox(user.getId());
    }

    @GetMapping("/conversation/{otherUserId}")
    public List<Message> getConversation(
            @PathVariable  Long otherUserId,
            Authentication authentication) {

        User user = currentUser(authentication);

        return service.getConversation(user.getId(), otherUserId);
    }

    @GetMapping("/chats")
    public List<ChatResponse> getChats(Authentication authentication) {

        User user = currentUser(authentication);

        return service.getChats(user.getId());
    }

    //get list of users to message to 
    @GetMapping("/users")
    public List<UserList> getAllUsers(Authentication authentication) {

        User user = currentUser(authentication);

        return userMessagingService.getAllUsers(user.getId());
    }

    //delete a single message
    @DeleteMapping("/{messageId}")
    public void deleteMEssage(@PathVariable Long messageId){
        service.deleteMessage(messageId);
    }

    //delete conversation
    @DeleteMapping("/conversation/{otherUserId}")
    public void deleteChat(@PathVariable Long otherUserId, Authentication authentication) {

        User user = currentUser(authentication);

        service.deleteChat(user.getId(), otherUserId);
    }
}
