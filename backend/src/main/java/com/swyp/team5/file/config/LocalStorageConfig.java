package com.swyp.team5.file.config;

import java.nio.file.Path;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(LocalStorageProperties.class)
@ConditionalOnProperty(prefix = "cloud.storage", name = "provider", havingValue = "LOCAL")
public class LocalStorageConfig implements WebMvcConfigurer {

    private final LocalStorageProperties properties;

    public LocalStorageConfig(LocalStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path baseDir = Path.of(properties.baseDirectory()).toAbsolutePath().normalize();
        registry.addResourceHandler(LocalStorageProperties.RESOURCE_PATH + "/**")
                .addResourceLocations("file:" + baseDir + "/");
    }
}
