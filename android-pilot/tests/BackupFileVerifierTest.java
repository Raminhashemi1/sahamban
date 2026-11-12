package ir.sahamban.pilot;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public final class BackupFileVerifierTest {
    private static void expect(boolean b, String message) {
        if (!b) throw new AssertionError(message);
    }
    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }
    public static void main(String[] args) throws IOException {
        byte[] example = bytes("{\"format\":\"sahamban-local-backup\",\"symbol\":\"فولاد\"}");
        expect(BackupFileVerifier.matches(new ByteArrayInputStream(example), example),
                "correct UTF-8 JSON must match");
        byte[] tampered = example.clone();
        tampered[12] ^= 1;
        expect(!BackupFileVerifier.matches(new ByteArrayInputStream(tampered), example),
                "modified bytes must fail");
        expect(!BackupFileVerifier.matches(new ByteArrayInputStream(
                Arrays.copyOf(example, example.length - 1)), example),
                "truncated file must fail");
        byte[] extra = Arrays.copyOf(example, example.length + 1);
        extra[extra.length - 1] = 65;
        expect(!BackupFileVerifier.matches(new ByteArrayInputStream(extra), example),
                "trailing old bytes must fail");
        expect(!BackupFileVerifier.matches(null, example), "null provider must fail");
        expect(!BackupFileVerifier.matches(new ByteArrayInputStream(example), new byte[0]),
                "empty expected file must fail");
        expect(!BackupFileVerifier.matches(new ByteArrayInputStream(example),
                new byte[BackupExportPolicy.MAX_JSON_BYTES + 1]),
                "oversized expected bytes must fail");
        byte[] large = new byte[BackupExportPolicy.MAX_JSON_BYTES];
        Arrays.fill(large, (byte) 65);
        expect(BackupFileVerifier.matches(new ByteArrayInputStream(large), large),
                "256 KiB exact maximum must match");
        InputStream broken = new InputStream() {
            @Override public int read() throws IOException { throw new IOException("provider lost data"); }
            @Override public int read(byte[] buf, int off, int len) throws IOException {
                throw new IOException("provider disconnected");
            }
        };
        boolean failedClosed = false;
        try {
            BackupFileVerifier.matches(broken, example);
        } catch (IOException expected) {
            failedClosed = true;
        }
        expect(failedClosed, "failed readback must propagate error");
        System.out.println("PASS: bounded readback verifies exact file contents");
    }
}
