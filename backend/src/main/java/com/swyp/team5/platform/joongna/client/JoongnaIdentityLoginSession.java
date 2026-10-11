package com.swyp.team5.platform.joongna.client;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import lombok.extern.slf4j.Slf4j;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import com.microsoft.playwright.Response;
import com.microsoft.playwright.Route;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitUntilState;
import com.swyp.team5.platform.bunjang.client.BunjangBrowserLauncher;
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.error.PlatformVerificationException;
import com.swyp.team5.platform.joongna.dto.JoongnaSession;
import com.swyp.team5.platform.verification.IdentityLoginSession;
import com.swyp.team5.platform.verification.dto.IdentityLoginResult;
import com.swyp.team5.platform.verification.dto.PlatformVerificationRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
public class JoongnaIdentityLoginSession implements IdentityLoginSession {

    private static final String SIGNIN_URL = "https://web.joongna.com/signin";
    private static final String SMS_PATH = "/mobilians/sms";
    private static final String VERIFY_PATH = "/mobilians/sms/verify";
    private static final String SESSION_COOKIE = "jn_web_session";
    private static final String WEB_AUTHENTICATION = "WEB_AUTHENTICATION";
    private static final String PHONE_JOIN = "PHONE_JOIN";
    private static final String SNS_JOIN = "SNS_JOIN";
    private static final int SUCCESS_CODE = 0;
    private static final int REGISTERED_ELSEWHERE_CODE = 400117;
    private static final int VIEWPORT_WIDTH = 480;
    private static final int VIEWPORT_HEIGHT = 1000;
    private static final List<String> JOIN_PATHS = List.of("/user/phone/join", "/v2/user/sns/join");

    private static final double RESPONSE_TIMEOUT_MS = 20_000;
    private static final long BUTTON_ENABLE_TIMEOUT_MS = 5_000;
    private static final long SESSION_COOKIE_TIMEOUT_MS = 15_000;
    private static final double POLL_INTERVAL_MS = 250;
    private static final double TYPING_DELAY_MS = 60;

    private static final String INVALID_INPUT_MESSAGE = "입력한 본인인증 정보를 확인해 주십시오.";
    private static final String ACCOUNT_STATE_MESSAGE = "중고나라 앱에서 계정 상태(휴면 등)를 확인한 뒤 다시 연결해 주십시오.";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final Playwright playwright;
    private final Page page;

    private JoongnaIdentityLoginSession(Playwright playwright, Page page) {
        this.playwright = playwright;
        this.page = page;
    }

    public static JoongnaIdentityLoginSession open(BunjangBrowserLauncher browserLauncher) {
        Playwright playwright = null;
        try {
            playwright = browserLauncher.createPlaywright();
            BrowserContext context =
                    browserLauncher.newContext(browserLauncher.launch(playwright), VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
            context.route(url -> JOIN_PATHS.stream().anyMatch(path(url)::endsWith), Route::abort);
            return new JoongnaIdentityLoginSession(playwright, context.newPage());
        } catch (PlaywrightException e) {
            if (playwright != null) {
                playwright.close();
            }
            throw PlatformVerificationException.failed(
                    "중고나라 브라우저 실행 실패. " + e.getClass().getSimpleName());
        }
    }

    @Override
    public void requestOtp(PlatformVerificationRequest request) {
        try {
            page.navigate(SIGNIN_URL, new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
            page.getByText("휴대폰번호로 시작하기").first().click();
            fillIdentityForm(request);
            submitIdentityForm();
        } catch (PlaywrightException e) {
            throw failed("requestOtp", e);
        }
    }

    @Override
    public IdentityLoginResult confirm(String otp) {
        try {
            Locator input = page.locator("input[inputmode='numeric']:visible").last();
            input.fill("");
            type(input, otp);
            Response response = page.waitForResponse(
                    candidate -> path(candidate.url()).endsWith(VERIFY_PATH),
                    new Page.WaitForResponseOptions().setTimeout(RESPONSE_TIMEOUT_MS),
                    () -> visibleButton("확인").click());
            JsonNode body = readBody(response);
            int code = body.path("meta").path("code").asInt(response.ok() ? 0 : -1);
            String verifyType = body.path("data").path("mobiliansVerfiyType").asString("");
            String logDetail = "step=verify, status=" + response.status() + ", code=" + code + ", type=" + verifyType;
            if (!isLogin(code, verifyType)) {
                if (isJoin(code, verifyType)) {
                    throw PlatformVerificationException.accountRequired(
                            PlatformType.JOONGNA.getPlatformName(), logDetail);
                }
                if (response.status() / 100 == 5) {
                    throw PlatformVerificationException.failed(logDetail);
                }
                String message = text(body.path("meta").path("message"));
                throw PlatformVerificationException.rejected(code == 0 ? ACCOUNT_STATE_MESSAGE : message, logDetail);
            }
            return new IdentityLoginResult(waitForSession().toJson(), false);
        } catch (PlaywrightException e) {
            throw failed("confirm", e);
        }
    }

    @Override
    public void close() {
        try {
            playwright.close();
        } catch (PlaywrightException e) {
            log.warn("중고나라 본인인증 브라우저 종료 실패. reason={}", e.getClass().getSimpleName());
        }
    }

    private static boolean isLogin(int code, String verifyType) {
        if (code == SUCCESS_CODE) {
            return WEB_AUTHENTICATION.equals(verifyType);
        }
        return code == REGISTERED_ELSEWHERE_CODE
                && (PHONE_JOIN.equals(verifyType) || WEB_AUTHENTICATION.equals(verifyType));
    }

    private static boolean isJoin(int code, String verifyType) {
        return SNS_JOIN.equals(verifyType) || (code == SUCCESS_CODE && PHONE_JOIN.equals(verifyType));
    }

    private void fillIdentityForm(PlatformVerificationRequest request) {
        type(page.locator("#name"), request.name());
        type(page.locator("#socialPreNo"), request.birthDate());
        type(page.locator("input[maxlength='1'][inputmode='numeric']").first(), request.genderDigit());
        page.getByText("선택해 주세요").first().click();
        page.getByText(request.carrier().getLabel(), new Page.GetByTextOptions().setExact(true))
                .last()
                .click();
        page.locator("#phoneNo").fill(request.phone());
    }

    private void submitIdentityForm() {
        Locator submit = page.getByRole(
                AriaRole.BUTTON, new Page.GetByRoleOptions().setName("제출하기").setExact(true));
        if (poll(BUTTON_ENABLE_TIMEOUT_MS, () -> Optional.of(submit).filter(Locator::isEnabled))
                .isEmpty()) {
            throw PlatformVerificationException.rejected(
                    INVALID_INPUT_MESSAGE, "제출하기 버튼이 활성화되지 않음. url=" + path(page.url()));
        }
        submit.click();
        page.getByText("전체 동의").first().click();
        callApi(SMS_PATH, "sms", () -> visibleButton("확인").click());
    }

    private JsonNode callApi(String apiPath, String step, Runnable action) {
        Response response = page.waitForResponse(
                candidate -> path(candidate.url()).endsWith(apiPath),
                new Page.WaitForResponseOptions().setTimeout(RESPONSE_TIMEOUT_MS),
                action);
        JsonNode body = readBody(response);
        int code = body.path("meta").path("code").asInt(response.ok() ? 0 : -1);
        if (response.ok() && code == 0) {
            return body;
        }
        String logDetail = "step=" + step + ", status=" + response.status() + ", code=" + code;
        if (response.status() / 100 == 5) {
            throw PlatformVerificationException.failed(logDetail);
        }
        throw PlatformVerificationException.rejected(text(body.path("meta").path("message")), logDetail);
    }

    private JoongnaSession waitForSession() {
        return poll(SESSION_COOKIE_TIMEOUT_MS, () -> page.context().cookies().stream()
                        .filter(cookie -> SESSION_COOKIE.equals(cookie.name) && cookie.value != null)
                        .findFirst()
                        .map(cookie -> JoongnaSession.parse(URLDecoder.decode(cookie.value, StandardCharsets.UTF_8))))
                .orElseThrow(
                        () -> PlatformVerificationException.failed("중고나라 로그인 후 세션 쿠키 없음. url=" + path(page.url())));
    }

    private Locator visibleButton(String name) {
        return page.getByRole(
                        AriaRole.BUTTON,
                        new Page.GetByRoleOptions().setName(name).setExact(true))
                .filter(new Locator.FilterOptions().setVisible(true))
                .last();
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

    private PlatformVerificationException failed(String step, PlaywrightException e) {
        return PlatformVerificationException.failed(
                "중고나라 step=" + step + ", " + e.getClass().getSimpleName() + ", url=" + path(page.url()));
    }

    private static JsonNode readBody(Response response) {
        try {
            return OBJECT_MAPPER.readTree(response.text());
        } catch (RuntimeException e) {
            return OBJECT_MAPPER.createObjectNode();
        }
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
