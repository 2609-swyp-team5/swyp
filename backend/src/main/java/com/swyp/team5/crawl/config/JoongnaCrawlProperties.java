package com.swyp.team5.crawl.config;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "crawl.joongna")
public record JoongnaCrawlProperties(@NotNull Integer pageLimit) {}
