package com.swyp.team5.file.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cloud.local-storage")
public record LocalStorageProperties(String baseDirectory, String baseUrl) {

    public static final String RESOURCE_PATH = "/files";
}
