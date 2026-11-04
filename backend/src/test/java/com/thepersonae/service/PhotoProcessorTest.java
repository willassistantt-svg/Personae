package com.thepersonae.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PhotoProcessorTest {

    private final PhotoProcessor processor = new PhotoProcessor();

    @Test
    void shrinksLargePhotosToTheLongEdgeLimit() throws IOException {
        BufferedImage stored = decode(processor.normalize(png(4000, 3000)));
        assertEquals(PhotoProcessor.MAX_EDGE, stored.getWidth());
        assertEquals(1500, stored.getHeight());
    }

    @Test
    void neverUpscalesSmallPhotos() throws IOException {
        BufferedImage stored = decode(processor.normalize(png(800, 1200)));
        assertEquals(800, stored.getWidth());
        assertEquals(1200, stored.getHeight());
    }

    @Test
    void turnsSidewaysCameraPhotosUpright() {
        BufferedImage rotated = PhotoProcessor.orient(new BufferedImage(400, 300, BufferedImage.TYPE_INT_RGB), 6);
        assertEquals(300, rotated.getWidth());
        assertEquals(400, rotated.getHeight());
    }

    @Test
    void rejectsFilesThatAreNotImages() {
        ApiException error = assertThrows(ApiException.class, () -> processor.normalize("not an image".getBytes()));
        assertEquals("FILE_TYPE", error.getCode());
    }

    private static byte[] png(int width, int height) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "png", bytes);
        return bytes.toByteArray();
    }

    private static BufferedImage decode(byte[] jpeg) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(jpeg));
    }
}
