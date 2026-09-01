package com.swyp.team5.file.service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.swyp.team5.file.error.FileStorageException;

@Component
public class StorageStrategyFactory {

    private final Map<StorageType, StorageStrategy> strategiesByType;

    public StorageStrategyFactory(List<StorageStrategy> strategies) {
        this.strategiesByType = strategies.stream()
                .collect(Collectors.toMap(
                        StorageStrategy::getType,
                        Function.identity(),
                        (a, b) -> a,
                        () -> new EnumMap<>(StorageType.class)));
    }

    public StorageStrategy getStrategy(StorageType type) {
        StorageStrategy strategy = strategiesByType.get(type);
        if (strategy == null) {
            throw new FileStorageException("지원하지 않는 스토리지 타입입니다: " + type);
        }
        return strategy;
    }
}
