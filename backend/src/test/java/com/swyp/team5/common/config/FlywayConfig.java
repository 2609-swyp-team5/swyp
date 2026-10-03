package com.swyp.team5.common.config;

import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 테스트 실행(JVM)마다 처음 한 번만 스키마를 clean 하고 마이그레이션 파일을 기준으로 다시 migrate하여 깨끗한 상태에서
 * 테스트가 돌도록 한다. 같은 실행 안에서 테스트 컨텍스트가 또 뜨면 clean 없이 migrate(이미 최신이면 검증만)만 한다 — 원격
 * DB라 clean·전체 마이그레이션이 1회 약 50초 걸리고, 컨텍스트마다 다시 하면 이미 떠 있는 컨텍스트의 커넥션이 들고 있는
 * enum 타입 OID가 바뀌어 오류가 나기도 한다.
 */
@Configuration
@Profile("test")
public class FlywayConfig {

    private static final AtomicBoolean CLEANED = new AtomicBoolean();

    @Bean
    public FlywayMigrationStrategy cleanMigrateStrategy() {
        return flyway -> {
            if (CLEANED.compareAndSet(false, true)) {
                flyway.clean();
            }
            flyway.migrate();
        };
    }
}
