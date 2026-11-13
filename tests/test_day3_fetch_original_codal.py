"""Offline tests; NO public CODAL traffic is generated."""
import hashlib
import importlib.util
import pathlib
import tempfile
import unittest


PATH = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "day3_fetch_original_codal.py"
spec = importlib.util.spec_from_file_location("day3_codal_capture", PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class FakeResponse:
    def __init__(self, body, url, status=200):
        self.body = body
        self.url = url
        self.status = status
        self.headers = {"Content-Type": "application/pdf"}

    def geturl(self):
        return self.url

    def read(self, count):
        return self.body[:count]

    def __enter__(self):
        return self

    def __exit__(self, *unused):
        return None


class FakeOpener:
    def __init__(self, substitute_url=None, invalid=False):
        self.substitute_url = substitute_url
        self.invalid = invalid

    def open(self, request, timeout):
        body = b"<html>403 forbidden</html>" if self.invalid else b"%PDF-1.7\noriginal but not cryptographically attested"
        return FakeResponse(body, self.substitute_url or request.full_url)


class SourceCaptureTests(unittest.TestCase):
    def test_known_original_urls_only(self):
        self.assertEqual(len(mod.DOCUMENTS), 2)
        for item in mod.DOCUMENTS.values():
            self.assertTrue(mod.allowed_origin(item["url"]))
        self.assertFalse(mod.allowed_origin("http://codal.ir/DownloadFile.aspx"))
        self.assertFalse(mod.allowed_origin("https://evil.example/document"))
        self.assertFalse(mod.allowed_origin("https://codal.ir.evil.example/download"))

    def test_reject_block_pages(self):
        with self.assertRaisesRegex(ValueError, "error or access-denied"):
            mod.check_document(b"<html><body>403 forbidden</body></html>")
        with self.assertRaisesRegex(ValueError, "unrecognized"):
            mod.check_document(b"fake data")
        self.assertEqual(mod.check_document(b"%PDF-1.7\noriginal"), "application/pdf")

    def test_capture_hashes_bytes_and_stays_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = mod.collect(tmp, FakeOpener())
            self.assertEqual(len(result["results"]), 2)
            self.assertFalse(result["issuerOriginalVerified"])
            self.assertFalse(result["sourceAuthenticated"])
            self.assertFalse(result["day3FinalAccepted"])
            self.assertFalse(result["tradingSignalsEnabled"])
            for evidence in result["results"].values():
                self.assertEqual(evidence["status"], "RAW_CAPTURED_FOR_INDEPENDENT_REVIEW")
                raw = (pathlib.Path(tmp) / evidence["filename"]).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), evidence["sha256"])
            self.assertTrue((pathlib.Path(tmp) / "codal-source-manifest.json").is_file())

    def test_cross_origin_and_blocked_do_not_create_evidence(self):
        for opener in (FakeOpener(substitute_url="https://untrusted.example/report.pdf"),
                       FakeOpener(invalid=True)):
            with tempfile.TemporaryDirectory() as tmp:
                result = mod.collect(tmp, opener)
                self.assertTrue(all(i["status"] == "FAILED" for i in result["results"].values()))
                self.assertFalse(any(pathlib.Path(tmp).glob("*.pdf")))
                self.assertFalse(result["issuerOriginalVerified"])


if __name__ == "__main__":
    unittest.main()
