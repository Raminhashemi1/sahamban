package ir.sahamban.pilot;

import java.io.IOException;
import java.io.InputStream;

/**
 * Compare the selected SAF document with exactly the bytes written to it.
 * No file contents are logged, uploaded or persisted in app storage.
 */
public final class BackupFileVerifier {
    private BackupFileVerifier() {}

    public static boolean matches(InputStream stream, byte[] expected) throws IOException {
        if (stream == null || expected == null
                || expected.length == 0
                || expected.length > BackupExportPolicy.MAX_JSON_BYTES) return false;

        byte[] buffer = new byte[4096];
        int offset = 0;
        while (offset < expected.length) {
            int length = stream.read(buffer, 0,
                    Math.min(buffer.length, expected.length - offset));
            if (length <= 0) return false; // Truncated or non-progressing provider.
            for (int i = 0; i < length; i++) {
                if (buffer[i] != expected[offset + i]) return false;
            }
            offset += length;
        }
        // Reject an existing file that retained a suffix after a short rewrite.
        return stream.read() == -1;
    }
}
