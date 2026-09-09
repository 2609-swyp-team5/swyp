plugins {
	java
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
	id("com.diffplug.spotless") version "7.0.2"
}

group = "com.swyp"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	// ==========================================
	// 웹, API 문서
	// ==========================================
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.0")

	// ==========================================
	// AI 모델 연동 (Gemini, GPT)
	// ==========================================
	implementation(platform("org.springframework.ai:spring-ai-bom:2.0.0"))
	implementation("org.springframework.ai:spring-ai-starter-model-openai")
	implementation("org.springframework.ai:spring-ai-starter-model-google-genai")

	// ==========================================
	// 파일 스토리지 (Cloudflare R2, S3 호환)
	// ==========================================
	implementation(platform("software.amazon.awssdk:bom:2.29.52"))
	implementation("software.amazon.awssdk:s3")
	implementation("software.amazon.awssdk:apache-client")

	// ==========================================
	// 데이터베이스, ORM, 마이그레이션
	// ==========================================
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-data-redis")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")
	testRuntimeOnly("com.h2database:h2")
	// ==========================================
	// 보안, 검증
	// ==========================================
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")

	// ==========================================
	// 모니터링
	// ==========================================
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("io.micrometer:micrometer-registry-prometheus")

	// ==========================================
	// 개발 편의 도구
	// ==========================================
	developmentOnly("org.springframework.boot:spring-boot-devtools")
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	// ==========================================
	// 테스트
	// ==========================================
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-redis-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")


}

// .env를 파싱해 환경변수로 주입
fun loadDotenv(): Map<String, String> {
	val envFile = file(".env")
	if (!envFile.exists()) {
		return emptyMap()
	}
	return envFile.readLines()
		.map { it.trim() }
		.filter { it.isNotEmpty() && !it.startsWith("#") }
		.mapNotNull { line ->
			val separatorIndex = line.indexOf('=')
			if (separatorIndex < 0) {
				return@mapNotNull null
			}
			val key = line.substring(0, separatorIndex).trim()
			var value = line.substring(separatorIndex + 1).trim()
			if (value.length >= 2 &&
				((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))
			) {
				value = value.substring(1, value.length - 1)
			}
			key to value
		}
		.toMap()
}

val dotenv = loadDotenv().filterKeys { System.getenv(it) == null }

tasks.withType<Test> {
	useJUnitPlatform()
	environment(dotenv)
	// 자동화 테스트는 Neon(local 프로필)이 아니라 격리된 H2 인메모리 DB(test 프로필)로 실행
	systemProperty("spring.profiles.active", "test")

    testLogging {
        // 테스트 실행 시 콘솔에 로그를 출력하도록 설정
        showStandardStreams = true
    }
}

tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
	environment(dotenv)
}

tasks.named<Test>("test") {
	// 외부 API를 호출하는 테스트여서 응답속도 지연, 비용문제로 기본 테스트 호출에서 제외함
    // AI 테스트는 아래와 같이 integrationTest 테스트로 진행
    // ./gradlew integrationTest --rerun-tasks --info
	useJUnitPlatform {
		excludeTags("ai-test")
	}
}

tasks.register<Test>("integrationTest") {

	description = "외부 API 연동이 필요한 통합 테스트입니다."
    useJUnitPlatform {
		includeTags("ai-test")
	}
	testClassesDirs = sourceSets["test"].output.classesDirs
	classpath = sourceSets["test"].runtimeClasspath
	shouldRunAfter(tasks.named("test"))
}

spotless {
	java {
		target("src/**/*.java")
        encoding("UTF-8")
		palantirJavaFormat()
		removeUnusedImports()
        importOrder("java", "jakarta", "lombok", "org.springframework", "")
		trimTrailingWhitespace()
		endWithNewline()
	}
}

tasks.named("check") {
	dependsOn(tasks.named("spotlessCheck"))
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
	archiveFileName.set("app.jar")
}

tasks.getByName<Jar>("jar") {
	enabled = false
}
