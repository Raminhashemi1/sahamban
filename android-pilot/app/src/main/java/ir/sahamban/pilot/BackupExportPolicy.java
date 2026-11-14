package ir.sahamban.pilot;

import java.nio.charset.StandardCharsets;

/** Strict, Android-independent checks used before opening a user-approved save dialog. */
public final class BackupExportPolicy {
    public static final int MAX_JSON_BYTES = 256 * 1024;
    public static final int MAX_MESSAGE_CHARS = 640 * 1024;
    public static final String LOCAL_NAME = "sahamban-local-backup-v1.json";
    public static final String PORTFOLIO_NAME = "sahamban-portfolio-backup.json";
    private BackupExportPolicy() {}

    public static boolean acceptsFilename(String filename) {
        return LOCAL_NAME.equals(filename) || PORTFOLIO_NAME.equals(filename);
    }

    public static boolean acceptsContents(String filename, String json) {
        if (!acceptsFilename(filename) || json == null || json.length() == 0
                || json.length() > MAX_JSON_BYTES) return false;
        if (json.charAt(0) != '{' || json.charAt(json.length() - 1) != '}') return false;
        return json.getBytes(StandardCharsets.UTF_8).length <= MAX_JSON_BYTES;
    }

    /** No broad subdomain wildcard and no scheme/port downgrade. */
    public static boolean acceptsSource(String origin, boolean isMainFrame, String pageUrl) {
        return isMainFrame
                && "https://raminhashemi1.github.io".equals(origin)
                && TrustedNavigation.isInternal(pageUrl);
    }
}
