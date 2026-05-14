package com.virtualpolice.vps.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.RescaleOp;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OcrService {
    private final String tesseractCommand;
    private final long maxFileSizeKb;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "application/pdf", "text/plain"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "pdf", "txt");

    public OcrService(@Value("${app.ocr.tesseract-command}") String tesseractCommand,
                      @Value("${app.ocr.max-file-size-kb:5120}") long maxFileSizeKb) {
        this.tesseractCommand = tesseractCommand;
        this.maxFileSizeKb = maxFileSizeKb;
    }

    /* ── Public API ────────────────────────────────────────────────────────── */

    public String extractText(MultipartFile file) {
        validateUpload(file);

        String contentType = normalize(file.getContentType());
        String fileName    = normalize(file.getOriginalFilename());

        String extracted;
        try {
            if (contentType.equals("application/pdf") || fileName.endsWith(".pdf")) {
                extracted = extractFromPdf(file);
            } else if (contentType.startsWith("image/") || hasImageExtension(fileName)) {
                extracted = extractFromImage(file);
            } else {
                extracted = new String(file.getBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Unable to read uploaded file", e);
        }

        String cleaned = normalizeExtractedText(extracted);
        if (cleaned.isBlank()) {
            throw new IllegalStateException("No readable text found in the uploaded document");
        }
        return cleaned;
    }

    public String summarizeForDescription(String text) {
        String normalized = normalizeExtractedText(text);
        if (normalized.isBlank()) return "";
        return normalized.length() <= 350 ? normalized : normalized.substring(0, 350) + "...";
    }

    public String buildSuggestedTitle(ParsedOcrData parsed, String category) {
        if (parsed != null && parsed.keywords() != null && !parsed.keywords().isBlank()) {
            String firstKeyword = parsed.keywords().split(",")[0].trim();
            return capitalize(firstKeyword) + " complaint";
        }
        if (category != null && !category.isBlank()) return category + " complaint";
        return "Complaint from uploaded document";
    }

    /* ── Validation ────────────────────────────────────────────────────────── */

    private void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Please upload a complaint file");
        if (file.getSize() > maxFileSizeKb * 1024L)
            throw new IllegalArgumentException("File too large. Maximum allowed size is " + maxFileSizeKb + " KB");
        String contentType = normalize(file.getContentType());
        String fileName    = normalize(file.getOriginalFilename());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType) && !hasAllowedExtension(fileName))
            throw new IllegalArgumentException("Unsupported file type. Use JPG, PNG, PDF, or TXT");
    }

    /* ── PDF extraction ────────────────────────────────────────────────────── */

    private String extractFromPdf(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            return new PDFTextStripper().getText(document);
        }
    }

    /* ── Image extraction (with preprocessing) ─────────────────────────────── */

    private String extractFromImage(MultipartFile file) throws IOException {
        String extension = extensionOf(normalize(file.getOriginalFilename()));
        if (extension.isBlank()) extension = "png";

        // Write original upload to a temp file
        Path rawPath = Files.createTempFile("vps-ocr-raw-", "." + extension);
        Path processedPath = null;
        try {
            file.transferTo(rawPath);

            // Pre-process image to maximise Tesseract accuracy on handwriting
            processedPath = preprocessImageForOcr(rawPath);
            Path tesseractInput = processedPath != null ? processedPath : rawPath;

            // Run Tesseract with LSTM engine + single-column page segmentation
            ProcessBuilder pb = new ProcessBuilder(
                    tesseractCommand,
                    tesseractInput.toAbsolutePath().toString(),
                    "stdout",
                    "--psm", "4",    // single column of text (good for letters/documents)
                    "--oem", "3"     // use LSTM + legacy engine (best accuracy)
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            int exit = process.waitFor();
            if (exit != 0 && output.toString().isBlank()) {
                throw new IllegalStateException("OCR engine could not process the uploaded image");
            }
            return output.toString();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("OCR processing interrupted", e);
        } finally {
            Files.deleteIfExists(rawPath);
            if (processedPath != null) Files.deleteIfExists(processedPath);
        }
    }

    /* ── Image preprocessing ───────────────────────────────────────────────── */

    /**
     * Prepares an image for Tesseract OCR with the following pipeline:
     *  1. Convert to grayscale
     *  2. Upscale to ≥ 2400 px wide (Tesseract needs ~300 DPI; phone photos are often low-res)
     *  3. Boost contrast with RescaleOp
     *  4. Binarize using Otsu's global threshold (separates ink from paper noise)
     *  5. Save as PNG (lossless, best for OCR)
     *
     * @return path to the processed PNG, or null if ImageIO could not decode the file.
     */
    private Path preprocessImageForOcr(Path inputPath) throws IOException {
        BufferedImage original = ImageIO.read(inputPath.toFile());
        if (original == null) return null; // unrecognised format — let Tesseract try the raw file

        int origW = original.getWidth();
        int origH = original.getHeight();

        // ── Step 1: grayscale ──────────────────────────────────────────────
        BufferedImage gray = toGrayscale(original);

        // ── Step 2: upscale ───────────────────────────────────────────────
        // Target at least 2400 px wide; keeps letter-paper legible for Tesseract
        int targetW = Math.max(origW, 2400);
        if (targetW > origW) {
            double scale = (double) targetW / origW;
            int targetH  = (int) (origH * scale);
            BufferedImage scaled = new BufferedImage(targetW, targetH, BufferedImage.TYPE_BYTE_GRAY);
            Graphics2D g2 = scaled.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g2.setRenderingHint(RenderingHints.KEY_RENDERING,     RenderingHints.VALUE_RENDER_QUALITY);
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,  RenderingHints.VALUE_ANTIALIAS_ON);
            g2.drawImage(gray, 0, 0, targetW, targetH, null);
            g2.dispose();
            gray = scaled;
        }

        // ── Step 3: contrast boost ─────────────────────────────────────────
        // Multiply pixel values by 1.4 and subtract 20 → darker ink, lighter background
        try {
            RescaleOp contrastOp = new RescaleOp(1.4f, -20f, null);
            gray = contrastOp.filter(gray, null);
        } catch (Exception ignored) {
            // RescaleOp may fail for binary images — safe to skip
        }

        // ── Step 4: Otsu binarisation ──────────────────────────────────────
        gray = applyOtsuBinarization(gray);

        // ── Step 5: save as PNG ────────────────────────────────────────────
        Path outPath = Files.createTempFile("vps-ocr-enhanced-", ".png");
        ImageIO.write(gray, "png", outPath.toFile());
        return outPath;
    }

    /** Convert any BufferedImage to a TYPE_BYTE_GRAY image. */
    private BufferedImage toGrayscale(BufferedImage src) {
        if (src.getType() == BufferedImage.TYPE_BYTE_GRAY) return src;
        BufferedImage gray = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = gray.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return gray;
    }

    /**
     * Otsu's global thresholding.
     * Computes the optimal luminance cut-point that maximises between-class variance
     * (foreground ink vs background paper), then produces a pure black-and-white image.
     */
    private BufferedImage applyOtsuBinarization(BufferedImage gray) {
        int w = gray.getWidth();
        int h = gray.getHeight();

        // Build 256-bin histogram
        int[] hist = new int[256];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int lum = gray.getRaster().getSample(x, y, 0);
                hist[lum & 0xFF]++;
            }
        }

        // Otsu's criterion
        long total = (long) w * h;
        double sum = 0;
        for (int i = 0; i < 256; i++) sum += (double) i * hist[i];

        double sumB = 0, wB = 0;
        double maxVar = 0;
        int threshold = 128;
        for (int t = 0; t < 256; t++) {
            wB += hist[t];
            if (wB == 0) continue;
            double wF = total - wB;
            if (wF == 0) break;
            sumB += (double) t * hist[t];
            double mB = sumB / wB;
            double mF = (sum - sumB) / wF;
            double varBetween = wB * wF * (mB - mF) * (mB - mF);
            if (varBetween > maxVar) {
                maxVar = varBetween;
                threshold = t;
            }
        }

        // Apply threshold → pure B&W
        BufferedImage binary = new BufferedImage(w, h, BufferedImage.TYPE_BYTE_GRAY);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int lum = gray.getRaster().getSample(x, y, 0);
                binary.getRaster().setSample(x, y, 0, lum > threshold ? 255 : 0);
            }
        }
        return binary;
    }

    /* ── Text normalisation ────────────────────────────────────────────────── */

    private String normalizeExtractedText(String text) {
        if (text == null) return "";
        return text
                .replaceAll("\r", "\n")
                .replaceAll("[\t ]+", " ")
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    /* ── Structured data parsing ───────────────────────────────────────────── */

    public ParsedOcrData parseStructuredData(String text) {
        String content = text == null ? "" : text;
        String lower   = content.toLowerCase();

        String name     = extractByPattern(content, "(?i)(?:name\\s*[:\\-]\\s*)([A-Za-z ]{3,60})");
        String location = extractByPattern(content, "(?i)(?:location|place|address|nagar|road|street|colony)\\s*[:\\-]?\\s*([A-Za-z0-9, .-]{3,100})");

        List<String> keywords = List.of(
                "theft", "stolen", "lost", "cyber", "assault", "fraud", "robbery",
                "phishing", "attack", "scam", "missing", "murder", "accident", "harassment"
        ).stream().filter(lower::contains).toList();

        if (name.isBlank()) {
            name = extractByPattern(content, "(?i)i\\s+am\\s+([A-Za-z ]{3,60})");
        }

        return new ParsedOcrData(name, location, String.join(", ", keywords));
    }

    /* ── Utility helpers ───────────────────────────────────────────────────── */

    private String extractByPattern(String text, String regex) {
        Matcher m = Pattern.compile(regex).matcher(text);
        return m.find() ? m.group(1).trim() : "";
    }

    private boolean hasImageExtension(String fileName) {
        String ext = extensionOf(fileName);
        return ext.equals("jpg") || ext.equals("jpeg") || ext.equals("png");
    }

    private boolean hasAllowedExtension(String fileName) {
        return ALLOWED_EXTENSIONS.contains(extensionOf(fileName));
    }

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return "";
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String normalize(String text) {
        return text == null ? "" : text.trim().toLowerCase(Locale.ROOT);
    }

    private String capitalize(String text) {
        if (text == null || text.isBlank()) return "";
        return text.substring(0, 1).toUpperCase(Locale.ROOT) + text.substring(1).toLowerCase(Locale.ROOT);
    }

    public record ParsedOcrData(String name, String location, String keywords) {}
}
