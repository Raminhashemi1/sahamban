package ir.sahamban.pilot;

import java.net.URI;

/** Accepts only a user-selected SAF content URI; never file:// or network URLs. */
public final class BackupImportPolicy {
    private BackupImportPolicy() {}

    public static boolean acceptsContentUri(String raw) {
        if (raw == null || raw.length() > 8192) return false;
        try {
            URI uri = URI.create(raw);
            String authority = uri.getRawAuthority();
            return "content".equalsIgnoreCase(uri.getScheme())
                    && authority != null && !authority.isEmpty()
                    && uri.getRawUserInfo() == null;
        } catch (IllegalArgumentException error) {
            return false;
        }
    }
}
