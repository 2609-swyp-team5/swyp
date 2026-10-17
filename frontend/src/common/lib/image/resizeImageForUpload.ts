/**
 * 업로드 전에 사진을 줄인다. 휴대폰 원본(장당 3~10MB)을 그대로 올리면 서버 업로드 한도(요청당 10MB)를 넘고, 사진이 그대로 실리는
 * AI 분석(Gemini 요청당 약 20MB)도 실패하므로 긴 변을 줄이고 JPEG로 다시 저장한다.
 *
 * 줄이는 데 실패하거나(지원하지 않는 브라우저·깨진 파일) 줄여도 이득이 없으면 원본을 그대로 돌려준다 — 줄이기 때문에 업로드가
 * 막히지 않게 한다.
 */

export type ResizeImageOptions = {
    /** 긴 변 최대 길이(px) */
    maxSide?: number;
    /** 목표 파일 크기(byte) — 넘으면 화질을 낮춰 다시 저장 */
    targetBytes?: number;
};

const DEFAULT_MAX_SIDE = 1920;
const DEFAULT_TARGET_BYTES = 900 * 1024;
// 목표 크기를 넘으면 차례로 낮춰 다시 저장한다(마지막 값으로도 넘으면 그 결과를 쓴다)
const JPEG_QUALITIES = [0.82, 0.72, 0.62];
const RESIZABLE_TYPES = new Set(["image/jpeg", "image/png"]);

/** 긴 변이 maxSide를 넘으면 비율을 유지해 줄인 크기, 넘지 않으면 원래 크기. */
export function fitWithin(width: number, height: number, maxSide: number) {
    const longSide = Math.max(width, height);
    if (longSide <= maxSide) {
        return { width, height };
    }
    const scale = maxSide / longSide;
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const toJpegName = (name: string) => `${name.replace(/\.[^.]+$/, "")}.jpg`;

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

export async function resizeImageForUpload(
    file: File,
    options: ResizeImageOptions = {},
): Promise<File> {
    const maxSide = options.maxSide ?? DEFAULT_MAX_SIDE;
    const targetBytes = options.targetBytes ?? DEFAULT_TARGET_BYTES;

    if (!RESIZABLE_TYPES.has(file.type) || typeof createImageBitmap !== "function") {
        return file;
    }

    let bitmap: ImageBitmap | null = null;
    try {
        // 휴대폰 사진의 회전 정보(EXIF)를 반영해 읽는다
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        const size = fitWithin(bitmap.width, bitmap.height, maxSide);
        if (size.width === bitmap.width && file.size <= targetBytes) {
            return file;
        }

        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext("2d");
        if (!context) {
            return file;
        }
        // 투명한 PNG를 JPEG로 바꾸면 검게 채워지므로 흰 배경을 먼저 깐다
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size.width, size.height);
        context.drawImage(bitmap, 0, 0, size.width, size.height);

        let blob: Blob | null = null;
        for (const quality of JPEG_QUALITIES) {
            blob = await canvasToBlob(canvas, quality);
            if (!blob || blob.size <= targetBytes) {
                break;
            }
        }
        if (!blob || blob.size >= file.size) {
            return file;
        }
        return new File([blob], toJpegName(file.name), {
            type: "image/jpeg",
            lastModified: file.lastModified,
        });
    } catch {
        return file;
    } finally {
        bitmap?.close();
    }
}

/** 여러 장을 순서대로 줄인다(한 번에 모두 디코딩하면 휴대폰 메모리가 부족할 수 있어 차례로). */
export async function resizeImagesForUpload(
    files: File[],
    options?: ResizeImageOptions,
): Promise<File[]> {
    const resized: File[] = [];
    for (const file of files) {
        resized.push(await resizeImageForUpload(file, options));
    }
    return resized;
}
