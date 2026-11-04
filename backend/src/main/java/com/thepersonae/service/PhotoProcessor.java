package com.thepersonae.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Every persona photograph is stored the same way: upright, at most {@value #MAX_EDGE}px on its
 * longest side, as a high-quality JPEG without the camera metadata.
 */
@Service
public class PhotoProcessor {

    static final int MAX_EDGE = 2000;
    static final float QUALITY = 0.92f;

    public PhotoProcessor() {
        ImageIO.scanForPlugins();
    }

    public byte[] normalize(byte[] original) {
        BufferedImage source;
        try {
            source = ImageIO.read(new ByteArrayInputStream(original));
        } catch (IOException ex) {
            source = null;
        }
        if (source == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_TYPE", "Use a JPG, PNG or WEBP photograph");
        }
        BufferedImage upright = orient(source, orientation(original));
        return jpeg(fit(upright, MAX_EDGE));
    }

    static BufferedImage orient(BufferedImage image, int orientation) {
        int w = image.getWidth();
        int h = image.getHeight();
        AffineTransform transform = switch (orientation) {
            case 2 -> new AffineTransform(-1, 0, 0, 1, w, 0);
            case 3 -> new AffineTransform(-1, 0, 0, -1, w, h);
            case 4 -> new AffineTransform(1, 0, 0, -1, 0, h);
            case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
            case 6 -> new AffineTransform(0, 1, -1, 0, h, 0);
            case 7 -> new AffineTransform(0, -1, -1, 0, h, w);
            case 8 -> new AffineTransform(0, -1, 1, 0, 0, w);
            default -> new AffineTransform();
        };
        boolean turned = orientation >= 5 && orientation <= 8;
        BufferedImage out = new BufferedImage(turned ? h : w, turned ? w : h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, out.getWidth(), out.getHeight());
        g.drawImage(image, transform, null);
        g.dispose();
        return out;
    }

    static BufferedImage fit(BufferedImage image, int maxEdge) {
        int longEdge = Math.max(image.getWidth(), image.getHeight());
        if (longEdge <= maxEdge) {
            return image;
        }
        double scale = (double) maxEdge / longEdge;
        int targetW = Math.max(1, (int) Math.round(image.getWidth() * scale));
        int targetH = Math.max(1, (int) Math.round(image.getHeight() * scale));
        BufferedImage current = image;
        int w = image.getWidth();
        int h = image.getHeight();
        while (w / 2 >= targetW && h / 2 >= targetH) {
            w /= 2;
            h /= 2;
            current = resize(current, w, h);
        }
        return w == targetW && h == targetH ? current : resize(current, targetW, targetH);
    }

    private static BufferedImage resize(BufferedImage source, int w, int h) {
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(source, 0, 0, w, h, null);
        g.dispose();
        return out;
    }

    private static int orientation(byte[] original) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(original));
            ExifIFD0Directory exif = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (exif != null && exif.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
                return exif.getInt(ExifIFD0Directory.TAG_ORIENTATION);
            }
        } catch (Exception ignored) {
            // Photos without readable EXIF are already upright.
        }
        return 1;
    }

    private static byte[] jpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(bytes)) {
            writer.setOutput(output);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(QUALITY);
            writer.write(null, new IIOImage(image, null, null), param);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILED", "Could not prepare the photograph");
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }
}
