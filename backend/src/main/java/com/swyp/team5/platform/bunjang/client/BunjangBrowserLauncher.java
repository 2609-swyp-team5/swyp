package com.swyp.team5.platform.bunjang.client;

import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;

@Slf4j
@Component
public class BunjangBrowserLauncher {

    private static final String USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

    // 기본값이면 첫 실행 시 Firefox/WebKit까지 전부 내려받으므로 자동 다운로드를 끄고 Chromium만 별도 설치한다
    // (./gradlew installPlaywrightChromium)
    private static final Map<String, String> PLAYWRIGHT_ENV = Map.of("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "1");

    /** 채널을 지정하지 않았을 때 시도 순서("" = Playwright 전용 Chromium). */
    private static final List<String> DEFAULT_CHANNELS = List.of("", "chrome", "msedge");

    private final boolean headless;

    // 비어 있으면 Playwright 전용 Chromium(./gradlew installPlaywrightChromium) → PC에 설치된 Chrome → Edge 순으로
    // 실행되는 것을 쓰고(따로 설치하지 않아도 되도록), "chrome"/"msedge" 등을 지정하면 그 브라우저만 쓴다
    private final String browserChannel;

    public BunjangBrowserLauncher(
            @Value("${platform.bunjang.publish.headless:true}") boolean headless,
            @Value("${platform.bunjang.publish.browser-channel:}") String browserChannel) {
        this.headless = headless;
        this.browserChannel = browserChannel == null ? "" : browserChannel.strip();
    }

    public Playwright createPlaywright() {
        return Playwright.create(new Playwright.CreateOptions().setEnv(PLAYWRIGHT_ENV));
    }

    public Browser launch(Playwright playwright) {
        if (!browserChannel.isEmpty()) {
            try {
                return playwright.chromium().launch(launchOptions(browserChannel));
            } catch (PlaywrightException e) {
                if (isBrowserMissing(e)) {
                    log.error("설정한 브라우저 채널({})이 이 PC에 설치되어 있지 않습니다.", browserChannel);
                }
                throw e;
            }
        }
        PlaywrightException missing = null;
        for (String channel : DEFAULT_CHANNELS) {
            try {
                Browser browser = playwright.chromium().launch(launchOptions(channel));
                if (!channel.isEmpty()) {
                    log.info("Playwright 전용 Chromium이 없어 PC에 설치된 브라우저({})를 사용합니다.", channel);
                }
                return browser;
            } catch (PlaywrightException e) {
                if (!isBrowserMissing(e)) {
                    throw e;
                }
                missing = e;
            }
        }
        log.error("실행할 브라우저가 없습니다. ./gradlew installPlaywrightChromium 을 실행하거나 Chrome/Edge를 설치하세요.");
        throw missing;
    }

    public BrowserContext newContext(Browser browser) {
        return newContext(browser, 1280, 1600);
    }

    public BrowserContext newContext(Browser browser, int width, int height) {
        BrowserContext context = browser.newContext(new Browser.NewContextOptions()
                .setLocale("ko-KR")
                .setUserAgent(USER_AGENT)
                .setViewportSize(width, height));
        context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});");
        return context;
    }

    private BrowserType.LaunchOptions launchOptions(String channel) {
        BrowserType.LaunchOptions options = new BrowserType.LaunchOptions()
                .setHeadless(headless)
                .setArgs(List.of("--disable-blink-features=AutomationControlled", "--no-sandbox"))
                .setIgnoreDefaultArgs(List.of("--enable-automation"));
        return channel.isEmpty() ? options : options.setChannel(channel);
    }

    /** 브라우저 실행 파일이 없어서 실패했는지(전용 Chromium: "Executable doesn't exist", 채널: "is not found"). */
    private static boolean isBrowserMissing(PlaywrightException e) {
        String message = e.getMessage();
        return message != null
                && (message.contains("Executable doesn't exist")
                        || message.contains("distribution") && message.contains("is not found"));
    }
}
