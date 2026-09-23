package com.swyp.team5.platform.bunjang.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import com.microsoft.playwright.Response;
import com.microsoft.playwright.options.Cookie;
import com.microsoft.playwright.options.WaitUntilState;
import com.swyp.team5.platform.bunjang.dto.BunjangListingForm;
import com.swyp.team5.platform.bunjang.dto.BunjangUploadResult;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.PlatformPublishFailedException;

/**
 * 회원의 번개장터 로그인 세션(bun_session)으로 판매 등록 화면을 헤드리스 브라우저(Playwright)로 채워
 * 매물을 등록한다. 번개장터는 판매자용 등록 API를 공개하지 않아, 실제 웹 화면(`/products/new`)을 사람이
 * 입력하듯 채우고 등록 버튼을 누르는 방식이다(비공식 - 화면 구조가 바뀌면 셀렉터 수정이 필요하다).
 * 요청마다 새 브라우저를 띄우고 세션 쿠키만 주입하므로, 서버에 회원별 브라우저 프로필을 저장하지 않는다.
 */
@Slf4j
@Component
public class BunjangProductUploader {

    private static final String HOME_URL = "https://bunjang.co.kr";
    private static final String PRODUCT_FORM_URL = HOME_URL + "/products/new";
    private static final String PRODUCT_URL_PREFIX = "https://m.bunjang.co.kr/products/";

    private static final String USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

    private static final int MAX_IMAGES = 12; // 번개장터 등록 가능 최대 이미지 수
    private static final int DEFAULT_SHIPPING_FEE = 3_000; // "배송비 별도"일 때 입력할 기본 배송비
    private static final Duration IMAGE_DOWNLOAD_TIMEOUT = Duration.ofSeconds(15);
    private static final double CREATE_RESPONSE_TIMEOUT_MS = 15_000;
    private static final int PRODUCT_URL_CONFIRM_ATTEMPTS = 15;

    // 기본값이면 첫 실행 시 Firefox/WebKit까지 전부 내려받으므로 자동 다운로드를 끄고 Chromium만 별도 설치한다
    // (./gradlew installPlaywrightChromium)
    private static final Map<String, String> PLAYWRIGHT_ENV = Map.of("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "1");

    private static final Pattern PRODUCT_ID_PATTERN =
            Pattern.compile("\"(?:pid|productId|product_id)\"\\s*:\\s*\"?(\\d{6,})\"?|/products/(\\d{6,})");
    private static final Pattern PRODUCT_DETAIL_URL_PATTERN = Pattern.compile("bunjang\\.co\\.kr/products/(\\d{6,})");

    private final HttpClient imageHttpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final boolean headless;

    public BunjangProductUploader(@Value("${platform.bunjang.publish.headless:true}") boolean headless) {
        this.headless = headless;
    }

    /**
     * @throws InvalidPlatformSessionException 세션이 만료되어 로그인 화면으로 이동된 경우
     * @throws PlatformPublishFailedException 이미지 다운로드/폼 입력/등록 요청이 실패했거나, 등록 여부를 확인할 수 없는 경우
     */
    public BunjangUploadResult upload(String sessionToken, BunjangListingForm form) {
        Path imageDir = null;
        try {
            imageDir = Files.createTempDirectory("bunjang-upload-");
            List<Path> images = downloadImages(form.imageUrls(), imageDir);
            log.info("번개장터 매물 등록 시작. title={}, imageCount={}", form.title(), images.size());

            try (Playwright playwright = Playwright.create(new Playwright.CreateOptions().setEnv(PLAYWRIGHT_ENV));
                    Browser browser = launchBrowser(playwright);
                    BrowserContext context = newContext(browser, sessionToken)) {
                Page page = context.newPage();
                openProductForm(page);
                uploadImages(page, images);
                fillTitle(page, form.title());
                selectCategory(page, form.categoryPath());
                fillTags(page, form.tags());
                selectCondition(page, form.conditionLabel());
                fillPrice(page, form.price());
                fillDescription(page, form.description());
                fillTradeOptions(page, form);

                String externalProductId = submitAndFindProductId(page, form);
                log.info("번개장터 매물 등록 완료. pid={}", externalProductId);
                return new BunjangUploadResult(externalProductId, PRODUCT_URL_PREFIX + externalProductId);
            }
        } catch (InvalidPlatformSessionException | PlatformPublishFailedException e) {
            throw e;
        } catch (IOException | PlaywrightException e) {
            throw new PlatformPublishFailedException("번개장터 매물 등록 중 오류가 발생했습니다: " + e.getMessage(), e);
        } finally {
            deleteQuietly(imageDir);
        }
    }

    private List<Path> downloadImages(List<String> imageUrls, Path dir) throws IOException {
        List<Path> paths = new ArrayList<>();
        for (String imageUrl : imageUrls.stream().limit(MAX_IMAGES).toList()) {
            Path target = dir.resolve("image-" + (paths.size() + 1) + "." + extensionOf(imageUrl));
            HttpRequest request = HttpRequest.newBuilder(URI.create(imageUrl))
                    .timeout(IMAGE_DOWNLOAD_TIMEOUT)
                    .GET()
                    .build();
            try {
                HttpResponse<Path> response = imageHttpClient.send(request, HttpResponse.BodyHandlers.ofFile(target));
                if (response.statusCode() / 100 != 2) {
                    throw new PlatformPublishFailedException(
                            "상품 이미지를 내려받지 못했습니다. status=" + response.statusCode() + ", url=" + imageUrl);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new PlatformPublishFailedException("상품 이미지 다운로드가 중단되었습니다.", e);
            }
            paths.add(target);
        }
        if (paths.isEmpty()) {
            throw new PlatformPublishFailedException("번개장터에 등록할 상품 이미지가 없습니다.");
        }
        return paths;
    }

    private Browser launchBrowser(Playwright playwright) {
        try {
            return playwright
                    .chromium()
                    .launch(new BrowserType.LaunchOptions()
                            .setHeadless(headless)
                            .setArgs(List.of("--disable-blink-features=AutomationControlled", "--no-sandbox"))
                            .setIgnoreDefaultArgs(List.of("--enable-automation")));
        } catch (PlaywrightException e) {
            if (e.getMessage() != null && e.getMessage().contains("Executable doesn't exist")) {
                log.error("Playwright Chromium이 설치되어 있지 않습니다. ./gradlew installPlaywrightChromium 을 먼저 실행하세요.");
            }
            throw e;
        }
    }

    private BrowserContext newContext(Browser browser, String sessionToken) {
        BrowserContext context = browser.newContext(new Browser.NewContextOptions()
                .setLocale("ko-KR")
                .setUserAgent(USER_AGENT)
                .setViewportSize(1280, 1600));
        context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});");
        context.addCookies(List.of(new Cookie("bun_session", sessionToken)
                .setDomain(".bunjang.co.kr")
                .setPath("/")
                .setSecure(true)));
        return context;
    }

    private void openProductForm(Page page) {
        page.navigate(PRODUCT_FORM_URL, new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
        page.waitForTimeout(3_000);
        if (page.url().contains("/login")) {
            throw new InvalidPlatformSessionException("번개장터 세션이 만료되었습니다. 번개장터에 다시 로그인한 뒤 세션을 재연동해 주세요.");
        }
        if (!exists(page.locator("input[type='file']"))) {
            throw new PlatformPublishFailedException("번개장터 판매 등록 화면을 확인할 수 없습니다. 현재 url=" + page.url());
        }
    }

    private void uploadImages(Page page, List<Path> images) {
        page.locator("input[type='file']").first().setInputFiles(images.toArray(Path[]::new));
        page.waitForTimeout(3_000); // 이미지 업로드(번개장터 미디어 서버 전송) 완료 대기
    }

    private void fillTitle(Page page, String title) {
        Locator input = firstExisting(
                page.locator("input[name='common.name']"),
                page.locator("input[placeholder*='상품명'], input[placeholder*='제목']"));
        if (input == null) {
            throw new PlatformPublishFailedException("번개장터 상품명 입력창을 찾을 수 없습니다.");
        }
        input.fill(title);
        page.waitForTimeout(500);
    }

    /** 카테고리 목록에서 대분류부터 순서대로 클릭하고, 목록 선택이 안 되면 상품명 기반 추천 카테고리 칩으로 대체한다. */
    private void selectCategory(Page page, List<String> categoryPath) {
        if (selectCategoryListItems(page, categoryPath) || selectSuggestedCategoryChip(page, categoryPath)) {
            return;
        }
        throw new PlatformPublishFailedException("번개장터 카테고리를 선택하지 못했습니다. category=" + String.join(" > ", categoryPath));
    }

    private boolean selectCategoryListItems(Page page, List<String> categoryPath) {
        Locator section = page.locator("#scroll-categoryId").first();
        if (!exists(section)) {
            return false;
        }
        section.scrollIntoViewIfNeeded();
        for (String name : categoryPath) {
            Locator item = findByExactText(section.locator("li, [role='button']"), name);
            if (item == null) {
                log.warn("번개장터 카테고리 항목을 찾을 수 없습니다. name={}", name);
                return false;
            }
            item.click();
            page.waitForTimeout(800);
        }
        return normalize(section.innerText()).contains(normalize(categoryPath.getLast()));
    }

    private boolean selectSuggestedCategoryChip(Page page, List<String> categoryPath) {
        Locator chips = page.locator("#scroll-name li[role='button']");
        String leaf = normalize(categoryPath.getLast());
        for (int i = 0; i < chips.count(); i++) {
            Locator chip = chips.nth(i);
            if (chip.isVisible() && normalize(chip.innerText()).endsWith(leaf)) {
                chip.click();
                page.waitForTimeout(1_200);
                return true;
            }
        }
        return false;
    }

    private void fillTags(Page page, List<String> tags) {
        Locator input = page.locator("input[placeholder*='태그']").first();
        if (tags.isEmpty() || !exists(input)) {
            return;
        }
        for (String tag : tags) {
            input.fill(tag);
            page.keyboard().press("Enter");
            page.waitForTimeout(300);
        }
    }

    private void selectCondition(Page page, String conditionLabel) {
        Locator opener = page.locator("button:has-text('상품 상태를 선택해 주세요')").first();
        if (exists(opener)) {
            opener.click();
            page.waitForTimeout(500);
        }
        Locator label = page.getByText(looseTextPattern(conditionLabel)).first();
        if (!exists(label)) {
            throw new PlatformPublishFailedException("번개장터 상품 상태 항목을 찾을 수 없습니다. condition=" + conditionLabel);
        }
        label.click();
        page.waitForTimeout(500);
    }

    private void fillPrice(Page page, long price) {
        Locator input =
                page.locator("input[placeholder*='가격'], input[name*='price']").first();
        if (!exists(input)) {
            throw new PlatformPublishFailedException("번개장터 가격 입력창을 찾을 수 없습니다.");
        }
        input.fill(String.valueOf(price));
        page.waitForTimeout(500);
    }

    private void fillDescription(Page page, String description) {
        Locator input = page.locator("textarea[placeholder*='설명'], textarea[placeholder*='본문']")
                .first();
        if (!exists(input)) {
            throw new PlatformPublishFailedException("번개장터 상품 설명 입력창을 찾을 수 없습니다.");
        }
        input.fill(description);
        page.waitForTimeout(500);
    }

    /** 직거래 가능 여부/희망 장소와 배송비 포함 여부를 입력한다. 화면에 해당 항목이 없으면 번개장터 기본값을 따른다. */
    private void fillTradeOptions(Page page, BunjangListingForm form) {
        Locator directTrade = form.directTrade()
                ? page.locator("label:has-text('가능')").first()
                : page.locator("label:has-text('불가')").first();
        if (exists(directTrade)) {
            directTrade.click();
            page.waitForTimeout(300);
        }
        if (form.directTrade() && form.directTradeLocation() != null) {
            Locator location = page.locator("#scroll-detailedAddress input").first();
            if (exists(location)) {
                location.fill(form.directTradeLocation());
            }
        }

        Pattern wanted = Pattern.compile(form.shippingFeeIncluded() ? "배송비\\s*포함" : "배송비\\s*별도");
        Locator trigger = page.locator("button, div[role='button'], [aria-haspopup='listbox']")
                .filter(new Locator.FilterOptions().setHasText(Pattern.compile("배송비\\s*(포함|별도)")))
                .first();
        if (exists(trigger) && !wanted.matcher(trigger.innerText()).find()) {
            trigger.click();
            page.waitForTimeout(500);
            Locator option = page.locator("li, [role='option']")
                    .filter(new Locator.FilterOptions().setHasText(wanted))
                    .first();
            if (exists(option)) {
                option.click();
                page.waitForTimeout(500);
            }
        }
        if (!form.shippingFeeIncluded()) {
            Locator fee = page.locator("input[placeholder*='배송비']").first();
            if (exists(fee)) {
                fee.fill(String.valueOf(DEFAULT_SHIPPING_FEE));
                page.keyboard().press("Tab"); // Enter는 폼이 조기 제출될 수 있어 사용하지 않는다
            }
        }
    }

    /**
     * 등록 버튼을 누른 뒤 ①상품 생성 API 응답 → ②이동된 상세 페이지 주소 → ③내 상점 상품 목록(상품명/가격 일치)
     * 순서로 새로 생성된 매물 ID를 찾는다.
     */
    private String submitAndFindProductId(Page page, BunjangListingForm form) {
        Locator submit = page.locator("button:has-text('등록하기'), button:has-text('등록'), button[type='submit']")
                .last();
        if (!exists(submit) || !submit.isEnabled()) {
            throw new PlatformPublishFailedException("활성화된 번개장터 등록 버튼을 찾을 수 없습니다(필수 입력값 누락 가능성).");
        }

        String pid = null;
        try {
            Response response = page.waitForResponse(
                    BunjangProductUploader::isProductCreateResponse,
                    new Page.WaitForResponseOptions().setTimeout(CREATE_RESPONSE_TIMEOUT_MS),
                    () -> {
                        submit.click();
                        clickConfirmIfPresent(page);
                    });
            if (response.status() / 100 != 2) {
                throw new PlatformPublishFailedException(
                        "번개장터 상품 등록 요청이 실패했습니다. status=" + response.status() + ", body=" + truncate(response.text()));
            }
            pid = findProductId(response.text());
        } catch (PlaywrightException e) {
            log.warn("번개장터 상품 생성 API 응답을 확인하지 못해 화면/목록 기준으로 확인합니다. reason={}", e.getMessage());
        }

        for (int i = 0; pid == null && i < PRODUCT_URL_CONFIRM_ATTEMPTS; i++) {
            Matcher matcher = PRODUCT_DETAIL_URL_PATTERN.matcher(page.url());
            if (matcher.find()) {
                pid = matcher.group(1);
            } else {
                page.waitForTimeout(1_000);
            }
        }
        if (pid == null) {
            pid = findLatestMyShopProductId(page, form);
        }
        if (pid == null) {
            throw new PlatformPublishFailedException(
                    "번개장터 등록 결과를 확인할 수 없습니다. 번개장터 내 상점에서 등록 여부를 확인한 뒤, 등록되어 있다면 매물 연동 API로 연결해 주세요.");
        }
        return pid;
    }

    private static boolean isProductCreateResponse(Response response) {
        String method = response.request().method();
        String url = response.url().toLowerCase(Locale.ROOT);
        return "POST".equalsIgnoreCase(method)
                && url.contains("/api/")
                && url.contains("product")
                && Stream.of("media", "image", "upload", "tag", "category", "shipping", "address")
                        .noneMatch(url::contains);
    }

    private void clickConfirmIfPresent(Page page) {
        page.waitForTimeout(500);
        Locator confirm = page.locator("button:has-text('확인')").last();
        if (exists(confirm) && confirm.isVisible()) {
            confirm.click();
        }
    }

    private String findLatestMyShopProductId(Page page, BunjangListingForm form) {
        try {
            Object result = page.evaluate(
                    """
                    async ({ name }) => {
                      const params = new URLSearchParams({ page: '0', size: '10', sort: 'createdAt,desc', name });
                      const res = await fetch('/api/pms/v2/my-shop/products?' + params, {
                        credentials: 'include', headers: { accept: 'application/json' } });
                      return res.ok ? await res.json() : null;
                    }
                    """,
                    Map.of("name", form.title()));
            return findMatchingProductId(result, form);
        } catch (PlaywrightException e) {
            log.warn("번개장터 내 상점 상품 목록 조회 실패. reason={}", e.getMessage());
            return null;
        }
    }

    /** 내 상점 상품 목록 응답(구조 비공개)을 재귀 탐색해 상품명과 가격이 같은 매물의 ID를 찾는다. */
    private String findMatchingProductId(Object node, BunjangListingForm form) {
        if (node instanceof Map<?, ?> map) {
            Object pid = firstNonNull(map, "pid", "productId", "id");
            Object name = firstNonNull(map, "name", "productName", "title");
            Object price = map.get("price");
            if (pid != null
                    && name != null
                    && normalize(name.toString()).equals(normalize(form.title()))
                    && (price == null
                            || String.valueOf(form.price())
                                    .equals(price.toString().replaceAll("\\D", "")))) {
                return pid.toString();
            }
            return findMatchingProductId(map.values(), form);
        }
        if (node instanceof Collection<?> values) {
            for (Object value : values) {
                String found = findMatchingProductId(value, form);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private static Object firstNonNull(Map<?, ?> map, String... keys) {
        return Stream.of(keys)
                .map(map::get)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    private static String findProductId(String body) {
        Matcher matcher = PRODUCT_ID_PATTERN.matcher(body == null ? "" : body);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
    }

    private static Locator firstExisting(Locator... candidates) {
        return Stream.of(candidates)
                .map(Locator::first)
                .filter(BunjangProductUploader::exists)
                .findFirst()
                .orElse(null);
    }

    private static Locator findByExactText(Locator items, String text) {
        String expected = normalize(text);
        for (int i = 0; i < items.count(); i++) {
            Locator item = items.nth(i);
            if (item.isVisible() && normalize(item.innerText()).equals(expected)) {
                return item;
            }
        }
        return null;
    }

    private static boolean exists(Locator locator) {
        try {
            return locator.count() > 0;
        } catch (PlaywrightException e) {
            return false;
        }
    }

    /** 번개장터 화면 문구의 띄어쓰기 차이(예: "새 상품(미사용)"/"새 상품 (미사용)")를 무시하고 매칭하는 패턴. */
    private static Pattern looseTextPattern(String text) {
        StringBuilder regex = new StringBuilder();
        text.replace(" ", "").codePoints().forEach(c -> regex.append(Pattern.quote(Character.toString(c)))
                .append("\\s*"));
        return Pattern.compile(regex.toString());
    }

    private static String normalize(String text) {
        return text == null ? "" : text.replaceAll("\\s+", "");
    }

    private static String extensionOf(String url) {
        String path = URI.create(url).getPath();
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return List.of("jpg", "jpeg", "png", "webp", "gif").contains(ext) ? ext : "jpg";
    }

    private static String truncate(String text) {
        return text == null || text.length() <= 300 ? text : text.substring(0, 300) + "...";
    }

    private static void deleteQuietly(Path dir) {
        if (dir == null) {
            return;
        }
        try (Stream<Path> paths = Files.walk(dir)) {
            paths.sorted(Comparator.reverseOrder())
                    .forEach(path -> path.toFile().delete());
        } catch (IOException e) {
            log.warn("번개장터 업로드 임시 파일 삭제 실패. dir={}", dir, e);
        }
    }
}
