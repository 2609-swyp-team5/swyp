package com.swyp.team5.product.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ProductRegisterStreamProperties.class)
public class ProductRegisterStreamConfig {}
