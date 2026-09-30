package com.swyp.team5.file.dto;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.file.error.FileStorageException;

/**
 * 업로드 요청 파일의 내용을 메모리에 복사해 둔 {@link MultipartFile}. 요청 스레드가 끝나면 서블릿 컨테이너가 원본
 * multipart 임시 파일을 지울 수 있으므로, 응답을 비동기(SSE)로 이어서 처리할 때 요청 스레드에서 미리 복사해 둔다.
 */
public final class InMemoryMultipartFile implements MultipartFile {

    private final String name;
    private final String originalFilename;
    private final String contentType;
    private final byte[] content;

    private InMemoryMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
        this.name = name;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.content = content;
    }

    /**
     * 이미 메모리에 있는 내용으로 파일을 만든다(예: 스토리지에서 내려받은 이미지).
     *
     * @param name 파트 이름
     * @param originalFilename 원본 파일명
     * @param contentType MIME 타입(모르면 {@code null})
     * @param content 파일 내용
     * @return 메모리 파일
     */
    public static InMemoryMultipartFile of(String name, String originalFilename, String contentType, byte[] content) {
        return new InMemoryMultipartFile(name, originalFilename, contentType, content);
    }

    /**
     * 요청 파일의 이름·타입·내용을 복사한다.
     *
     * @param file 복사할 요청 파일
     * @return 메모리에 복사된 파일
     * @throws FileStorageException 파일 내용을 읽지 못한 경우
     */
    public static InMemoryMultipartFile copyOf(MultipartFile file) {
        try {
            return new InMemoryMultipartFile(
                    file.getName(), file.getOriginalFilename(), file.getContentType(), file.getBytes());
        } catch (IOException e) {
            throw new FileStorageException("업로드한 파일을 읽지 못했습니다: " + file.getOriginalFilename(), e);
        }
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public String getOriginalFilename() {
        return originalFilename;
    }

    @Override
    public String getContentType() {
        return contentType;
    }

    @Override
    public boolean isEmpty() {
        return content.length == 0;
    }

    @Override
    public long getSize() {
        return content.length;
    }

    @Override
    public byte[] getBytes() {
        return content.clone();
    }

    @Override
    public InputStream getInputStream() {
        return new ByteArrayInputStream(content);
    }

    @Override
    public void transferTo(java.io.File dest) throws IOException {
        Files.write(dest.toPath(), content);
    }

    @Override
    public void transferTo(Path dest) throws IOException {
        Files.write(dest, content);
    }
}
