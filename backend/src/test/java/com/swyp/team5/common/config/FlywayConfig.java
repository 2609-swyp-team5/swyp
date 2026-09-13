package com.swyp.team5.common.config;

import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 매 테스트 실행 시작 시 스키마를 clean 하고
 * 마이그레이션 파일을 기준으로 다시 migrate하여
 * 깨끗한 상태에서 테스트가 돌도록 한다.
 */
@Configuration
@Profile("test")
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy cleanMigrateStrategy() {
        return flyway -> {
            flyway.clean();
            flyway.migrate();
        };
    }
}
