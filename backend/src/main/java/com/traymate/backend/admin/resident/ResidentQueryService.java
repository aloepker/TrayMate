package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.ResidentCardDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResidentQueryService {

    private final ResidentRepository repository;

    public List<ResidentCardDto> getAllResidents() {
        return repository.findAll()
                .stream()
                .map(r -> new ResidentCardDto(
                        r.getId(),
                        r.getFirstName() + " " + r.getLastName(),
                        r.getRoomNumber(),
                        r.getFoodAllergies()
                ))
                .toList();
    }
}
