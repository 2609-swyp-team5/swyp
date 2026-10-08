package com.swyp.team5.platform.bunjang.client;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

import lombok.extern.slf4j.Slf4j;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import com.microsoft.playwright.Response;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.Cookie;
import com.microsoft.playwright.options.WaitUntilState;
import com.swyp.team5.common.common.ErrorDetail;
import com.swyp.team5.platform.bunjang.dto.BunjangIdentityLoginResult;
import com.swyp.team5.platform.bunjang.dto.BunjangVerificationRequest;
import com.swyp.team5.platform.error.BunjangVerificationException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
public class BunjangIdentityLoginSession implements AutoCloseable {

    private static final String LOGIN_URL = "https://m.bunjang.co.kr/login?header=true";
    private static final String VALIDATION_PATH = "/api/ums/v2/ident/request-validation";
    private static final String IDENT_PATH = "/api/ums/v1/ident/web";
    private static final String JOIN_PATH = "/api/ums/v5/join";
    private static final String SESSION_COOKIE = "bun_session";

    private static final List<String> REQUIRED_TERMS =
            List.of("번개장터 이용약관 (필수)", "휴대폰 본인확인서비스 (필수)", "위치정보 이용약관 동의 (필수)");
    private static final List<Map.Entry<String, String>> VALIDATION_FIELDS = List.of(
            Map.entry("nameErrorMessage", "name"),
            Map.entry("registrationNumberErrorMessage", "birthDate"),
            Map.entry("carrierErrorMessage", "carrier"),
            Map.entry("phoneErrorMessage", "phone"));

    private static final double RESPONSE_TIMEOUT_MS = 20_000;
    private static final double BUTTON_ENABLE_TIMEOUT_MS = 5_000;
    private static final long SESSION_COOKIE_TIMEOUT_MS = 15_000;
    private static final double POLL_INTERVAL_MS = 250;
    private static final double TYPING_DELAY_MS = 60;

    private static final String INVALID_INPUT_MESSAGE = "입력한 본인인증 정보를 확인해 주십시오.";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final Playwright playwright;
    private final Page page;

    private BunjangIdentityLoginSession(Playwright playwright, Page page) {
        this.playwright = playwright;
        this.page = page;
    }

    public static BunjangIdentityLoginSession open(BunjangBrowserLauncher browserLauncher) {
        Playwright playwright = null;
        try {
            playwright = browserLauncher.createPlaywright();
            BrowserContext context = browserLauncher.newContext(browserLauncher.launch(playwright));
            return new BunjangIdentityLoginSession(playwright, context.newPage());
        } catch (PlaywrightException e) {
            if (playwright != null) {
                playwright.close();
            }
            throw BunjangVerificationException.failed(
                    "브라우저 실행 실패. " + e.getClass().getSimpleName());
        }
    }

    public void requestOtp(BunjangVerificationRequest request) {
        try {
            openIdentityForm();
            fillIdentityForm(request);
            submitIdentityForm();
        } catch (PlaywrightException e) {
            throw failed("requestOtp", e);
        }
    }

    public BunjangIdentityLoginResult confirm(String otp) {
        try {
            if (!page.url().contains("/signup/otp")) {
                throw BunjangVerificationException.failed("인증번호 화면이 아님. url=" + path(page.url()));
            }
            Locator input = page.locator("input[name='otp']");
            input.fill("");
            type(input, otp);

            Locator confirmButton = page.getByRole(
                            AriaRole.BUTTON,
                            new Page.GetByRoleOptions().setName("확인").setExact(true))
                    .last();
            JsonNode data = callApi(
                            JOIN_PATH,
                            "join",
                            RESPONSE_TIMEOUT_MS,
                            () -> confirmButton.click(new Locator.ClickOptions().setTimeout(BUTTON_ENABLE_TIMEOUT_MS)))
                    .path("data");
            return new BunjangIdentityLoginResult(
                    waitForSessionToken(), data.path("isJoined").asBoolean(false));
        } catch (PlaywrightException e) {
            throw failed("confirm", e);
        }
    }

    @Override
    public void close() {
        try {
            playwright.close();
        } catch (PlaywrightException e) {
            log.warn("번개장터 본인인증 브라우저 종료 실패. reason={}", e.getClass().getSimpleName());
        }
    }

    private void openIdentityForm() {
        page.navigate(LOGIN_URL, new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
        page.getByText("본인인증으로 로그인").first().click();
        page.waitForURL(url -> url.contains("/signup"), new Page.WaitForURLOptions().setTimeout(RESPONSE_TIMEOUT_MS));
    }

    private void fillIdentityForm(BunjangVerificationRequest request) {
        type(page.locator("input[placeholder='홍길동']"), request.name());
        type(page.locator("input[placeholder='YYMMDD']"), request.birthDate());
        type(page.locator("#genderDigit"), request.genderDigit());
        page.locator("button[class*='_trigger']").first().click();
        page.getByRole(
                        AriaRole.BUTTON,
                        new Page.GetByRoleOptions()
                                .setName(request.carrier().getLabel())
                                .setExact(true))
                .click();
        type(page.locator("input[placeholder='01012345678']"), request.phone());

        for (String term : REQUIRED_TERMS) {
            Locator checkbox = page.getByRole(
                    AriaRole.CHECKBOX, new Page.GetByRoleOptions().setName(term).setExact(true));
            if (!"true".equals(checkbox.getAttribute("aria-checked"))) {
                checkbox.click();
            }
        }
    }

    private void submitIdentityForm() {
        Locator next = page.getByRole(
                AriaRole.BUTTON, new Page.GetByRoleOptions().setName("다음").setExact(true));
        if (poll((long) BUTTON_ENABLE_TIMEOUT_MS, () -> Optional.of(next).filter(Locator::isEnabled))
                .isEmpty()) {
            throw BunjangVerificationException.rejected(
                    INVALID_INPUT_MESSAGE, "다음 버튼이 활성화되지 않음. url=" + path(page.url()));
        }

        callApi(
                IDENT_PATH,
                "ident",
                2 * RESPONSE_TIMEOUT_MS,
                () -> rejectInvalidInput(
                        callApi(VALIDATION_PATH, "request-validation", RESPONSE_TIMEOUT_MS, next::click)
                                .path("data")));
    }

    private JsonNode callApi(String apiPath, String step, double timeoutMs, Runnable action) {
        Response response = page.waitForResponse(
                candidate -> candidate.url().contains(apiPath),
                new Page.WaitForResponseOptions().setTimeout(timeoutMs),
                action);
        JsonNode body = readBody(response);
        if (response.ok()) {
            return body;
        }
        String logDetail =
                "step=" + step + ", status=" + response.status() + ", errorCode=" + text(body.path("errorCode"));
        if (response.status() / 100 == 4) {
            throw BunjangVerificationException.rejected(text(body.path("reason")), logDetail);
        }
        throw BunjangVerificationException.failed(logDetail);
    }

    private void rejectInvalidInput(JsonNode data) {
        JsonNode valid = data.path("isValidAll");
        if (!valid.isBoolean() || valid.asBoolean()) {
            return;
        }
        List<ErrorDetail> details = VALIDATION_FIELDS.stream()
                .map(field -> new ErrorDetail(field.getValue(), text(data.path(field.getKey()))))
                .filter(detail -> !detail.content().isEmpty())
                .toList();
        throw BunjangVerificationException.rejected(INVALID_INPUT_MESSAGE, details, "step=request-validation");
    }

    private String waitForSessionToken() {
        Cookie session = poll(SESSION_COOKIE_TIMEOUT_MS, () -> page.context().cookies().stream()
                        .filter(cookie ->
                                SESSION_COOKIE.equals(cookie.name) && cookie.value != null && !cookie.value.isBlank())
                        .findFirst())
                .orElseThrow(() -> BunjangVerificationException.failed("로그인 후 세션 쿠키 없음. url=" + path(page.url())));
        logExpiry(session);
        return session.value;
    }

    private <T> Optional<T> poll(long timeoutMs, Supplier<Optional<T>> probe) {
        long deadline = System.currentTimeMillis() + timeoutMs;
        Optional<T> value = probe.get();
        while (value.isEmpty() && System.currentTimeMillis() < deadline) {
            page.waitForTimeout(POLL_INTERVAL_MS);
            value = probe.get();
        }
        return value;
    }

    private BunjangVerificationException failed(String step, PlaywrightException e) {
        return BunjangVerificationException.failed(
                "step=" + step + ", " + e.getClass().getSimpleName() + ", url=" + path(page.url()));
    }

    private static JsonNode readBody(Response response) {
        try {
            return OBJECT_MAPPER.readTree(response.text());
        } catch (RuntimeException e) {
            return OBJECT_MAPPER.createObjectNode();
        }
    }

    private static void logExpiry(Cookie session) {
        if (session.expires == null || session.expires <= 0) {
            log.info("번개장터 세션 쿠키에 만료 시각이 없습니다(브라우저 세션 쿠키).");
            return;
        }
        Instant expiresAt = Instant.ofEpochSecond(session.expires.longValue());
        log.info(
                "번개장터 세션 쿠키 만료 시각: {} (약 {}일 후)",
                expiresAt,
                Duration.between(Instant.now(), expiresAt).toDays());
    }

    private static void type(Locator input, String value) {
        input.click();
        input.pressSequentially(value, new Locator.PressSequentiallyOptions().setDelay(TYPING_DELAY_MS));
    }

    private static String text(JsonNode node) {
        return node.isMissingNode() || node.isNull()
                ? ""
                : node.asString().replaceAll("\\s+", " ").strip();
    }

    private static String path(String url) {
        int query = url.indexOf('?');
        return query < 0 ? url : url.substring(0, query);
    }
}
