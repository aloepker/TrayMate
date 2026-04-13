package com.traymate.backend.messaging;

import java.time.LocalDateTime;
//import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;
import com.traymate.backend.messaging.dto.ChatResponse;
import com.traymate.backend.messaging.dto.MessageResponse;
import com.traymate.backend.messaging.dto.SendMessageRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository repository;
    private final UserRepository userRepository;

    public MessageResponse sendMessage(Long senderId, SendMessageRequest req){

        Message message = Message.builder()
                    .senderId(senderId)
                    .receiverId(req.getReceiverId())
                    .content(req.getContent())
                    .createdAt(LocalDateTime.now())
                    .isRead(false)
                    .build();

        Message saved = repository.save(message);

        return MessageResponse.builder()
                .id(saved.getId())
                .senderId(saved.getSenderId())
                .receiverId(saved.getReceiverId())
                .content(saved.getContent())
                .createdAt(saved.getCreatedAt())
                .isRead(saved.getIsRead())
                .build();
    }

    public List<Message> getInbox(Long receiverId){
        return repository.findByReceiverId(receiverId);
    } 

    // public List<Message> getConversation(Long senderId, Long receiverId){
    //     return repository.findBySenderIdAndReceiverId(senderId, receiverId);
    // }

    //full coversation + mark as read 
    public List<Message> getConversation(Long userId, Long otherUserId){

        List<Message> messages =
                repository.findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByCreatedAtAsc(
                        userId, otherUserId,
                        otherUserId, userId
                );

        // auto mark as read
        messages.stream()
                .filter(m -> m.getReceiverId().equals(userId) && !m.getIsRead())
                .forEach(m -> m.setIsRead(true));

        repository.saveAll(messages);

        return messages;
    }

//     public List<ChatResponse> getChats(Long userId){

//         List<Message> allMessages =
//                 repository.findBySenderIdOrReceiverIdOrderByCreatedAtDesc(userId, userId);

//         Map<Long, Message> latestChats = new HashMap<>();

//         for (Message msg : allMessages) {

//             Long otherUserId = msg.getSenderId().equals(userId)
//                     ? msg.getReceiverId()
//                     : msg.getSenderId();

//             //keep only latest message per user
//             if (!latestChats.containsKey(otherUserId)) {
//                 latestChats.put(otherUserId, msg);
//             }
//         }

//         //convert to DTO
//         return latestChats.values().stream()
//                 .map(msg -> ChatResponse.builder()
//                         .id(msg.getId())
//                         .content(msg.getContent())
//                         .createdAt(msg.getCreatedAt())
//                         .isRead(msg.getIsRead())
//                         .build())
//                 .toList();
//     }

        //new chat function
        public List<ChatResponse> getChats(Long userId) {

                List<Message> allMessages =
                        repository.findBySenderIdOrReceiverIdOrderByCreatedAtDesc(userId, userId);

                Map<Long, Message> latestChats = new HashMap<>();

                for (Message msg : allMessages) {

                        Long otherUserId = msg.getSenderId().equals(userId)
                                ? msg.getReceiverId()
                                : msg.getSenderId();

                        // keep only latest message per user
                        if (!latestChats.containsKey(otherUserId)) {
                        latestChats.put(otherUserId, msg);
                        }
                }

                //convert to DTO WITH names
                return latestChats.values().stream()
                        .map(msg -> {

                                User sender = userRepository.findById(msg.getSenderId())
                                        .orElseThrow();

                                User receiver = userRepository.findById(msg.getReceiverId())
                                        .orElseThrow();

                                return ChatResponse.builder()
                                        .id(msg.getId())
                                        .content(msg.getContent())
                                        .createdAt(msg.getCreatedAt())
                                        .isRead(msg.getIsRead())

                                        //IDs
                                        .senderId(msg.getSenderId())
                                        .receiverId(msg.getReceiverId())

                                        //Names
                                        .senderName(sender.getFullName())
                                        .receiverName(receiver.getFullName())

                                        .build();
                        })
                        .toList();
        }
    
}
