package com.swyp.team5.productanalysis.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({ProductAnalysisProperties.class, AnalysisStreamProperties.class})
public class ProductAnalysisConfig {}
