package com.swyp.team5.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import com.google.genai.Client;
import org.junit.jupiter.api.Test;

class GeminiClientConfigTest {

    private final ApplicationContextRunner contextRunner =
            new ApplicationContextRunner().withUserConfiguration(GeminiClientConfig.class);

    @Test
    void doesNotRetryQuotaExceeded() {
        assertThat(GeminiClientConfig.RETRY_OPTIONS.httpStatusCodes())
                .hasValueSatisfying(
                        codes -> assertThat(codes).doesNotContain(429).contains(503));
        assertThat(GeminiClientConfig.RETRY_OPTIONS.attempts()).contains(2);
    }

    @Test
    void createsClientWithApiKey() {
        contextRunner
                .withPropertyValues("spring.ai.google.genai.api-key=test-key")
                .run(context -> assertThat(context).hasSingleBean(Client.class));
    }

    @Test
    void failsWithoutApiKey() {
        contextRunner.run(context -> assertThat(context).hasFailed());
    }
}
